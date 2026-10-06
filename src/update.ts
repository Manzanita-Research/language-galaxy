import { Array, Number, Option, pipe } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Dialog, Slider, Tabs } from '@foldkit/ui'

import { FocusDetailTitle, FrameSky, SyncSky } from './command'
import { findTour } from './domain/catalogue'
import type { Constellation } from './domain/constellation'
import {
  FIRST_EPOCH,
  PRESENT,
  epochForTourStep,
  epochToReveal,
} from './domain/epoch'
import { Focus, focusedTourId, isAtStop } from './domain/focus'
import { Framing, framingFor } from './galaxy/scene'
import { Message } from './message'
import { Arrival, type GuideTab, type Model, Playback, Sky } from './model'
import { GuideTabs } from './view/guide'

type UpdateReturn = Update.Return<Model, Message>

const YEARS_PER_SECOND = 6.5
const LONGEST_FRAME_MS = 48
const MS_PER_SECOND = 1000

// SKY

/** Bring the sky up to date with the Model, flying the camera when a
 *  framing is given. Nothing is sent until the sky is live; it reads the
 *  whole scene when it wakes. */
const showSky = (
  model: Model,
  maybeFraming: Option.Option<Framing>,
): UpdateReturn =>
  Sky.match(model.sky, {
    Waking: () => ({ model }),
    Unavailable: () => ({ model }),
    Live: () => ({
      model,
      commands: [
        SyncSky({
          scene: {
            focus: model.focus,
            epoch: model.epoch,
            hiddenConstellations: model.hiddenConstellations,
            isScenery: model.arrival._tag === 'Welcoming',
          },
        }),
        ...Array.map(Array.fromOption(maybeFraming), framing =>
          FrameSky({ framing }),
        ),
      ],
    }),
  })

/** Move attention, keep the sky in step, and fly the camera there. */
const attend = (model: Model, focus: Focus, epoch: number): UpdateReturn =>
  showSky(
    modifyFields(model, {
      focus: () => focus,
      epoch: () => epoch,
      playback: () => Playback.Paused(),
    }),
    Option.some(framingFor(focus)),
  )

const focusStar = (model: Model, starId: string): UpdateReturn =>
  attend(model, Focus.Star({ starId }), epochToReveal(model.epoch, starId))

const goToTourStep = (
  model: Model,
  tourId: string,
  stepIndex: number,
): UpdateReturn =>
  Option.match(findTour(tourId), {
    onNone: () => ({ model }),
    onSome: tour => {
      const bounded = Number.clamp(stepIndex, {
        minimum: 0,
        maximum: tour.steps.length - 1,
      })
      return isAtStop(model.focus, tourId, bounded)
        ? { model }
        : attend(
            model,
            Focus.Tour({ tourId, stepIndex: bounded }),
            epochForTourStep(tourId, bounded),
          )
    },
  })

const stepTour = (model: Model, direction: 1 | -1): UpdateReturn =>
  Focus.matchOrElse<UpdateReturn>(
    model.focus,
    {
      Tour: ({ tourId, stepIndex }) =>
        goToTourStep(model, tourId, stepIndex + direction),
    },
    () => ({ model }),
  )

/** Keep keyboard focus after a link inside the detail panel replaces it. */
const keepingDetailFocus = (result: UpdateReturn): UpdateReturn => ({
  model: result.model,
  commands: [...(result.commands ?? []), FocusDetailTitle()],
})

/** A journey entered from a star starts at that star's stop. */
const startTourAt = (
  model: Model,
  tourId: string,
  starId: string,
): UpdateReturn =>
  goToTourStep(
    model,
    tourId,
    pipe(
      findTour(tourId),
      Option.flatMap(tour =>
        Array.findFirstIndex(tour.steps, step => step.star === starId),
      ),
      Option.getOrElse(() => 0),
    ),
  )

const startTour = (model: Model, tourId: string): UpdateReturn =>
  Option.contains(focusedTourId(model.focus), tourId)
    ? { model }
    : goToTourStep(model, tourId, 0)

const returnToOverview = (model: Model): UpdateReturn =>
  attend(model, Focus.Overview(), model.epoch)

const clickStar = (model: Model, starId: string): UpdateReturn =>
  Arrival.match(model.arrival, {
    Welcoming: () =>
      focusStar(
        modifyFields(model, { arrival: () => Arrival.Exploring() }),
        starId,
      ),
    Exploring: () =>
      Focus.matchOrElse<UpdateReturn>(
        model.focus,
        {
          Tour: ({ tourId }) =>
            pipe(
              findTour(tourId),
              Option.flatMap(tour =>
                Array.findFirstIndex(tour.steps, step => step.star === starId),
              ),
              Option.match({
                onNone: () => focusStar(model, starId),
                onSome: stepIndex => goToTourStep(model, tourId, stepIndex),
              }),
            ),
        },
        () => focusStar(model, starId),
      ),
  })

/** Let go of a star or an idea where it is, without moving the camera.
 *  Journeys ignore stray clicks; the title card has nothing to let go. */
const clickEmptySky = (model: Model): UpdateReturn => {
  const letGo = () =>
    showSky(
      modifyFields(model, {
        focus: () => Focus.Overview(),
        playback: () => Playback.Paused(),
      }),
      Option.none(),
    )
  return Arrival.match(model.arrival, {
    Welcoming: () => ({ model }),
    Exploring: () =>
      Focus.match(model.focus, {
        Overview: () => ({ model }),
        Star: letGo,
        Idea: letGo,
        Tour: () => ({ model }),
      }),
  })
}

const enterSky = (
  model: Model,
  epoch: number,
  playback: Playback,
): UpdateReturn =>
  showSky(
    modifyFields(model, {
      arrival: () => Arrival.Exploring(),
      focus: () => Focus.Overview(),
      epoch: () => epoch,
      playback: () => playback,
    }),
    Option.some(Framing.Whole()),
  )

const setEpoch = (
  model: Model,
  epoch: number,
  playback: Playback,
): UpdateReturn =>
  showSky(
    modifyFields(model, {
      epoch: () =>
        Number.clamp(epoch, { minimum: FIRST_EPOCH, maximum: PRESENT }),
      playback: () => playback,
    }),
    Option.none(),
  )

/** A tick queued before a pause must not restart playback. */
const tickPlayback = (model: Model, deltaTime: number): UpdateReturn =>
  Playback.match(model.playback, {
    Paused: () => ({ model }),
    Playing: () => {
      const epoch =
        model.epoch +
        (Math.min(deltaTime, LONGEST_FRAME_MS) / MS_PER_SECOND) *
          YEARS_PER_SECOND
      return epoch >= PRESENT
        ? setEpoch(model, PRESENT, Playback.Paused())
        : setEpoch(model, epoch, Playback.Playing())
    },
  })

const toggleConstellation = (
  model: Model,
  constellation: Constellation,
): UpdateReturn =>
  showSky(
    modifyFields(model, {
      hiddenConstellations: hidden =>
        Array.contains(hidden, constellation)
          ? Array.filter(hidden, other => other !== constellation)
          : Array.append(hidden, constellation),
    }),
    Option.none(),
  )

// CHILD COMPONENTS

const foldGuideTabs = Update.foldChild({
  update: GuideTabs.update,
  read: (model: Model) => Option.some(model.guideTabs),
  write: (model, nextGuideTabs) =>
    modifyFields(model, { guideTabs: () => nextGuideTabs }),
  toParentMessage: message => Message.GotGuideTabsMessage({ message }),
  foldOutMessage: Tabs.OutMessage.match<
    Update.Step<Model, Message>,
    Tabs.OutMessage<GuideTab>
  >({
    Selected:
      ({ value }) =>
      model => ({ model: modifyFields(model, { guideTab: () => value }) }),
  }),
})

const foldEpochSlider = Update.foldChild({
  update: Slider.update,
  read: (model: Model) => Option.some(model.epochSlider),
  write: (model, nextEpochSlider) =>
    modifyFields(model, { epochSlider: () => nextEpochSlider }),
  toParentMessage: message => Message.GotEpochSliderMessage({ message }),
  foldOutMessage: Slider.OutMessage.match<Update.Step<Model, Message>>({
    ChangedValue:
      ({ value }) =>
      model =>
        setEpoch(model, value, Playback.Paused()),
  }),
})

const foldAboutDialogOutMessage = Dialog.OutMessage.match<
  Update.Step<Model, Message>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({ model }),
})

const foldAboutDialog = Update.foldChild({
  update: Dialog.update,
  read: (model: Model) => Option.some(model.aboutDialog),
  write: (model, nextAboutDialog) =>
    modifyFields(model, { aboutDialog: () => nextAboutDialog }),
  toParentMessage: message => Message.GotAboutDialogMessage({ message }),
  foldOutMessage: foldAboutDialogOutMessage,
})

const foldAboutDialogOpen = Update.foldChildStep({
  update: Dialog.open,
  read: (model: Model) => Option.some(model.aboutDialog),
  write: (model, nextAboutDialog) =>
    modifyFields(model, { aboutDialog: () => nextAboutDialog }),
  toParentMessage: message => Message.GotAboutDialogMessage({ message }),
  foldOutMessage: foldAboutDialogOutMessage,
})

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    SucceededMountSky: () => {
      const next = modifyFields(model, { sky: () => Sky.Live() })
      return showSky(next, Option.some(framingFor(next.focus)))
    },
    FailedMountSky: ({ reason }) => ({
      model: modifyFields(model, { sky: () => Sky.Unavailable({ reason }) }),
    }),
    LostSkyDevice: ({ reason }) => ({
      model: modifyFields(model, { sky: () => Sky.Unavailable({ reason }) }),
    }),
    ClickedStar: ({ starId }) => clickStar(model, starId),
    ClickedEmptySky: () => clickEmptySky(model),
    SucceededSyncSky: () => ({ model }),
    FailedSyncSky: () => ({ model }),
    SucceededFrameSky: () => ({ model }),
    FailedFrameSky: () => ({ model }),

    ClickedWatchHistory: () => enterSky(model, FIRST_EPOCH, Playback.Playing()),
    ClickedExploreSky: () => enterSky(model, model.epoch, model.playback),

    GotGuideTabsMessage: ({ message }) => foldGuideTabs(model, message),
    ClickedIdea: ({ ideaId }) => attend(model, Focus.Idea({ ideaId }), PRESENT),
    ClickedTour: ({ tourId }) => startTour(model, tourId),
    ClickedRelatedStar: ({ starId }) =>
      keepingDetailFocus(focusStar(model, starId)),
    ClickedRelatedIdea: ({ ideaId }) =>
      keepingDetailFocus(attend(model, Focus.Idea({ ideaId }), PRESENT)),
    ClickedRelatedTour: ({ tourId, starId }) =>
      keepingDetailFocus(startTourAt(model, tourId, starId)),
    CompletedFocusDetailTitle: () => ({ model }),
    ClickedTourStep: ({ stepIndex }) =>
      Option.match(focusedTourId(model.focus), {
        onNone: () => ({ model }),
        onSome: tourId => goToTourStep(model, tourId, stepIndex),
      }),
    ClickedNextStep: () => stepTour(model, 1),
    ClickedPreviousStep: () => stepTour(model, -1),
    ClickedFinishTour: () => keepingDetailFocus(returnToOverview(model)),
    ClickedWholeSky: () => keepingDetailFocus(returnToOverview(model)),
    ToggledConstellation: ({ constellation }) =>
      toggleConstellation(model, constellation),

    ClickedPlay: () =>
      setEpoch(
        model,
        model.epoch >= PRESENT ? FIRST_EPOCH : model.epoch,
        Playback.Playing(),
      ),
    ClickedPause: () => setEpoch(model, model.epoch, Playback.Paused()),
    ClickedNow: () => setEpoch(model, PRESENT, Playback.Paused()),
    TickedPlayback: ({ deltaTime }) => tickPlayback(model, deltaTime),
    GotEpochSliderMessage: ({ message }) => foldEpochSlider(model, message),

    PressedEscape: () =>
      Focus.matchOrElse<UpdateReturn>(
        model.focus,
        { Overview: () => ({ model }) },
        () => returnToOverview(model),
      ),
    PressedArrowRight: () => stepTour(model, 1),
    PressedArrowLeft: () => stepTour(model, -1),

    ClickedAbout: () => foldAboutDialogOpen(model),
    GotAboutDialogMessage: ({ message }) => foldAboutDialog(model, message),
  })
