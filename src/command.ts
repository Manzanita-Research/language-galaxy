import { Array, Effect, Option, Queue, Stream } from 'effect'
import { Command, Dom, Mount } from 'foldkit'

import { type GalaxyEngine, createGalaxyEngine } from './galaxy/engine'
import { findEngine, forgetEngine, registerEngine } from './galaxy/host'
import {
  Framing,
  type FreeArea,
  GalaxyEvent,
  GalaxyScene,
  OBSTRUCTION_ATTRIBUTE,
} from './galaxy/scene'
import { Message } from './message'

const SKY_HOST_ID = 'lambda-galaxy-sky'
const SKY_ASLEEP = 'The sky is not awake yet.'
/** A panel taller than this share of the viewport is a column at one side;
 *  anything shorter is a bar along the top or bottom. */
const COLUMN_SHARE = 0.45
/** Frames to wait so the panels a framing measures have rendered: the
 *  first run plus one repeat. */
const SETTLE_REPEATS = 1

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const withEngine = (
  use: (engine: GalaxyEngine) => void,
): Effect.Effect<void, string> =>
  Option.match(findEngine(SKY_HOST_ID), {
    onNone: () => Effect.fail(SKY_ASLEEP),
    onSome: engine => Effect.sync(() => use(engine)),
  })

export const SyncSky = Command.define('SyncSky', {
  args: { scene: GalaxyScene },
  messages: [Message.SucceededSyncSky, Message.FailedSyncSky],
  execute: ({ scene }) =>
    withEngine(engine => engine.show(scene)).pipe(
      Effect.as(Message.SucceededSyncSky()),
      Effect.catch(reason => Effect.succeed(Message.FailedSyncSky({ reason }))),
    ),
})

const nextFrame = Effect.callback<void>(resume => {
  const request = requestAnimationFrame(() => resume(Effect.void))
  return Effect.sync(() => cancelAnimationFrame(request))
})

/** The part of the viewport no panel covers, read from every element marked
 *  with the obstruction attribute. */
const measureFreeArea = Effect.sync((): FreeArea => {
  const width = window.innerWidth
  const height = window.innerHeight
  return Array.reduce(
    Array.fromIterable(
      document.querySelectorAll(`[data-${OBSTRUCTION_ATTRIBUTE}]`),
    ),
    { left: 0, top: 0, right: width, bottom: height },
    (free, element) => {
      const rect = element.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) {
        return free
      }
      const isColumn = rect.height > height * COLUMN_SHARE
      const isOnLeft = rect.left + rect.width / 2 < width / 2
      const isOnTop = rect.top + rect.height / 2 < height / 2
      return isColumn
        ? isOnLeft
          ? { ...free, left: Math.max(free.left, rect.right) }
          : { ...free, right: Math.min(free.right, rect.left) }
        : isOnTop
          ? { ...free, top: Math.max(free.top, rect.bottom) }
          : { ...free, bottom: Math.min(free.bottom, rect.top) }
    },
  )
})

export const FrameSky = Command.define('FrameSky', {
  args: { framing: Framing },
  messages: [Message.SucceededFrameSky, Message.FailedFrameSky],
  execute: ({ framing }) =>
    Effect.gen(function* () {
      yield* Effect.repeat(nextFrame, { times: SETTLE_REPEATS })
      const free = yield* measureFreeArea
      yield* withEngine(engine => engine.frame(framing, free))
      return Message.SucceededFrameSky()
    }).pipe(
      Effect.catch(reason =>
        Effect.succeed(Message.FailedFrameSky({ reason })),
      ),
    ),
})

/** The heading of whatever the detail panel shows. */
export const DETAIL_TITLE_ID = 'detail-title'

/** Following a link inside the detail panel replaces the panel, and the
 *  link with it; keep keyboard focus by moving it to the new heading. */
export const FocusDetailTitle = Command.define('FocusDetailTitle', {
  messages: [Message.CompletedFocusDetailTitle],
  execute: nextFrame.pipe(
    Effect.andThen(Dom.focus(`#${DETAIL_TITLE_ID}`)),
    Effect.ignore,
    Effect.as(Message.CompletedFocusDetailTitle()),
  ),
})

type SkyMessage =
  | typeof Message.SucceededMountSky.Type
  | typeof Message.FailedMountSky.Type
  | typeof Message.LostSkyDevice.Type
  | typeof Message.ClickedStar.Type
  | typeof Message.ClickedEmptySky.Type

const eventToMessage = (event: GalaxyEvent): SkyMessage =>
  GalaxyEvent.match(event, {
    ClickedStar: ({ starId }) => Message.ClickedStar({ starId }),
    ClickedEmptySky: () => Message.ClickedEmptySky(),
    LostDevice: ({ reason }) => Message.LostSkyDevice({ reason }),
  })

/** Light the sky when its host element enters the DOM, report clicks and
 *  GPU loss for as long as it lives, and release the GPU when it leaves.
 *  While time travel shows a historical view, the sky ignores all pointer
 *  input: no picking, panning or zooming. */
export const MountSky = Mount.defineStream('MountSky', {
  messages: [
    Message.SucceededMountSky,
    Message.FailedMountSky,
    Message.LostSkyDevice,
    Message.ClickedStar,
    Message.ClickedEmptySky,
  ],
  execute: ({ element, viewStateChanges }) =>
    Stream.callback<SkyMessage>(queue =>
      Effect.gen(function* () {
        if (!(element instanceof HTMLElement)) {
          return yield* Effect.fail('The sky host is not an HTMLElement.')
        }
        const engine = yield* Effect.acquireRelease(
          Effect.tryPromise({
            try: () => createGalaxyEngine(element),
            catch: errorMessage,
          }).pipe(
            Effect.tap(created =>
              Effect.sync(() => registerEngine(SKY_HOST_ID, created)),
            ),
          ),
          created =>
            Effect.sync(() => {
              forgetEngine(SKY_HOST_ID, created)
              created.dispose()
            }),
        )
        yield* Effect.acquireRelease(
          Effect.sync(() =>
            engine.subscribe(event =>
              Queue.offerUnsafe(queue, eventToMessage(event)),
            ),
          ),
          unsubscribe => Effect.sync(unsubscribe),
        )
        yield* viewStateChanges.pipe(
          Stream.runForEach(viewState =>
            Effect.sync(() => engine.setInteractive(viewState === 'Live')),
          ),
          Effect.forkScoped,
        )
        Queue.offerUnsafe(queue, Message.SucceededMountSky())
        return yield* Effect.never
      }).pipe(
        Effect.catch(reason =>
          Effect.sync(() =>
            Queue.offerUnsafe(queue, Message.FailedMountSky({ reason })),
          ),
        ),
      ),
    ),
})
