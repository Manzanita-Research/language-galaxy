import { Array, Option, pipe } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import { FocusDetailTitle, FrameSky, SyncSky } from './command'
import { findTour, tours, yearOf } from './domain/catalogue'
import { FIRST_EPOCH, PRESENT } from './domain/epoch'
import { Focus } from './domain/focus'
import type { Tour } from './domain/tour'
import { Message, init, update } from './main'
import { Arrival, type Model, Playback, Sky } from './model'

const initial: Model = init().model

const exploring: Model = modifyFields(initial, {
  arrival: () => Arrival.Exploring(),
})

const live: Model = modifyFields(exploring, { sky: () => Sky.Live() })

const touring = (tourId: string, stepIndex: number): Model =>
  modifyFields(live, { focus: () => Focus.Tour({ tourId, stepIndex }) })

const settleSky = Command.resolveAll(
  [SyncSky, Message.SucceededSyncSky()],
  [FrameSky, Message.SucceededFrameSky()],
  [FocusDetailTitle, Message.CompletedFocusDetailTitle()],
)

const birthYear = (starId: string): number =>
  Option.getOrElse(yearOf(starId), () => 0)

const effectTour = Option.getOrThrowWith(
  findTour('effect'),
  () => new Error('The Effect tour is missing'),
)

/** A journey stop born earlier than some stop before it, so the sky must
 *  hold its later year rather than jump back. */
const backwardsStop = pipe(
  tours,
  Array.flatMap((tour: Tour) =>
    Array.map(tour.steps, (step, stepIndex) => ({ tour, step, stepIndex })),
  ),
  Array.findFirst(({ tour, step, stepIndex }) =>
    Array.some(
      Array.take(tour.steps, stepIndex),
      earlier => birthYear(earlier.star) > birthYear(step.star),
    ),
  ),
  Option.getOrThrowWith(() => new Error('No journey ever steps back in time')),
)

describe('the sky', () => {
  test('waking up syncs and frames the current scene', () => {
    story(
      update,
      given(exploring),
      message(Message.SucceededMountSky()),
      model(next => {
        expect(next.sky._tag).toBe('Live')
      }),
      Command.expectExact(SyncSky, FrameSky),
      settleSky,
    )
  })

  test('without WebGPU the sky is unavailable and nothing is sent to it', () => {
    story(
      update,
      given(exploring),
      message(Message.FailedMountSky({ reason: 'No adapter' })),
      Command.expectNone(),
      model(next => {
        expect(next.sky).toEqual(Sky.Unavailable({ reason: 'No adapter' }))
      }),
    )
  })

  test('losing the GPU darkens the sky', () => {
    story(
      update,
      given(live),
      message(Message.LostSkyDevice({ reason: 'Device lost' })),
      Command.expectNone(),
      model(next => {
        expect(next.sky).toEqual(Sky.Unavailable({ reason: 'Device lost' }))
      }),
    )
  })

  test('a sync that finds no sky leaves the Model alone', () => {
    story(
      update,
      given(live),
      message(Message.FailedSyncSky({ reason: 'The sky is not awake yet.' })),
      Command.expectNone(),
      model(next => {
        expect(next).toEqual(live)
      }),
    )
  })

  test('while waking, focusing a star sends no Commands', () => {
    story(
      update,
      given(exploring),
      message(Message.ClickedStar({ starId: 'haskell' })),
      Command.expectNone(),
      model(next => {
        expect(next.focus).toEqual(Focus.Star({ starId: 'haskell' }))
      }),
    )
  })

  test('a frame that finds no sky leaves the Model alone', () => {
    story(
      update,
      given(live),
      message(Message.FailedFrameSky({ reason: 'The sky is not awake yet.' })),
      Command.expectNone(),
      model(next => {
        expect(next).toEqual(live)
      }),
    )
  })

  test('clicking a star on the title card enters the sky focused on it', () => {
    story(
      update,
      given(modifyFields(initial, { sky: () => Sky.Live() })),
      message(Message.ClickedStar({ starId: 'lisp' })),
      Command.expectExact(SyncSky, FrameSky),
      settleSky,
      model(next => {
        expect(next.arrival._tag).toBe('Exploring')
        expect(next.focus).toEqual(Focus.Star({ starId: 'lisp' }))
      }),
    )
  })

  test('clicking empty sky on the title card does nothing', () => {
    const title = modifyFields(initial, { sky: () => Sky.Live() })
    story(
      update,
      given(title),
      message(Message.ClickedEmptySky()),
      Command.expectNone(),
      model(next => {
        expect(next).toEqual(title)
      }),
    )
  })

  test('exploring from the title card syncs and frames the whole sky', () => {
    story(
      update,
      given(modifyFields(initial, { sky: () => Sky.Live() })),
      message(Message.ClickedExploreSky()),
      Command.expectExact(SyncSky, FrameSky),
      settleSky,
      model(next => {
        expect(next.arrival._tag).toBe('Exploring')
      }),
    )
  })
})

describe('focusing a star', () => {
  test('lights its lineage, pauses time and flies the camera', () => {
    story(
      update,
      given(modifyFields(live, { playback: () => Playback.Playing() })),
      message(Message.ClickedStar({ starId: 'effect' })),
      Command.expectExact(SyncSky, FrameSky),
      settleSky,
      model(next => {
        expect(next.focus).toEqual(Focus.Star({ starId: 'effect' }))
        expect(next.playback._tag).toBe('Paused')
      }),
    )
  })

  test('reveals a star that is still in the future', () => {
    story(
      update,
      given(modifyFields(live, { epoch: () => 1950 })),
      message(Message.ClickedStar({ starId: 'haskell' })),
      settleSky,
      model(next => {
        expect(next.epoch).toBeGreaterThanOrEqual(birthYear('haskell'))
      }),
    )
  })

  test('clicking empty sky lets go of the star without moving the camera', () => {
    story(
      update,
      given(
        modifyFields(live, {
          focus: () => Focus.Star({ starId: 'lisp' }),
          playback: () => Playback.Playing(),
        }),
      ),
      message(Message.ClickedEmptySky()),
      Command.expectExact(SyncSky),
      settleSky,
      model(next => {
        expect(next.focus).toEqual(Focus.Overview())
        expect(next.playback._tag).toBe('Paused')
      }),
    )
  })

  test('following a related star from the panel keeps keyboard focus', () => {
    story(
      update,
      given(
        modifyFields(live, { focus: () => Focus.Star({ starId: 'lisp' }) }),
      ),
      message(Message.ClickedRelatedStar({ starId: 'scheme' })),
      Command.expectExact(SyncSky, FrameSky, FocusDetailTitle),
      settleSky,
      model(next => {
        expect(next.focus).toEqual(Focus.Star({ starId: 'scheme' }))
      }),
    )
  })

  test('a journey entered from a star starts at that star', () => {
    const middle = Option.getOrThrow(Array.get(effectTour.steps, 3))
    story(
      update,
      given(
        modifyFields(live, {
          focus: () => Focus.Star({ starId: middle.star }),
        }),
      ),
      message(
        Message.ClickedRelatedTour({ tourId: 'effect', starId: middle.star }),
      ),
      settleSky,
      model(next => {
        expect(next.focus).toEqual(
          Focus.Tour({ tourId: 'effect', stepIndex: 3 }),
        )
      }),
    )
  })

  test('a playback tick that arrives after a pause is ignored', () => {
    story(
      update,
      given(modifyFields(live, { epoch: () => 1990 })),
      message(Message.TickedPlayback({ deltaTime: 16 })),
      Command.expectNone(),
      model(next => {
        expect(next.epoch).toBe(1990)
        expect(next.playback._tag).toBe('Paused')
      }),
    )
  })

  test('escape returns to the whole sky', () => {
    story(
      update,
      given(
        modifyFields(live, { focus: () => Focus.Idea({ ideaId: 'monads' }) }),
      ),
      message(Message.PressedEscape()),
      settleSky,
      model(next => {
        expect(next.focus).toEqual(Focus.Overview())
      }),
    )
  })
})

describe('journeys', () => {
  test('starting a journey goes to its first stop, as of that year', () => {
    const firstStar = Array.headNonEmpty(effectTour.steps).star
    story(
      update,
      given(live),
      message(Message.ClickedTour({ tourId: 'effect' })),
      settleSky,
      model(next => {
        expect(next.focus).toEqual(
          Focus.Tour({ tourId: 'effect', stepIndex: 0 }),
        )
        expect(Math.floor(next.epoch)).toBe(
          Math.max(FIRST_EPOCH, birthYear(firstStar)),
        )
      }),
    )
  })

  test('choosing the journey already under way keeps your place', () => {
    story(
      update,
      given(touring('effect', 3)),
      message(Message.ClickedTour({ tourId: 'effect' })),
      Command.expectNone(),
      model(next => {
        expect(next.focus).toEqual(
          Focus.Tour({ tourId: 'effect', stepIndex: 3 }),
        )
      }),
    )
  })

  test('next and back walk the stops', () => {
    story(
      update,
      given(touring('effect', 0)),
      message(Message.ClickedNextStep()),
      settleSky,
      message(Message.PressedArrowRight()),
      settleSky,
      model(next => {
        expect(next.focus).toEqual(
          Focus.Tour({ tourId: 'effect', stepIndex: 2 }),
        )
      }),
      message(Message.PressedArrowLeft()),
      settleSky,
      model(next => {
        expect(next.focus).toEqual(
          Focus.Tour({ tourId: 'effect', stepIndex: 1 }),
        )
      }),
    )
  })

  test('the ends of a journey stay put and leave the camera alone', () => {
    story(
      update,
      given(touring('effect', 0)),
      message(Message.PressedArrowLeft()),
      Command.expectNone(),
    )
    story(
      update,
      given(touring('effect', effectTour.steps.length - 1)),
      message(Message.PressedArrowRight()),
      Command.expectNone(),
    )
  })

  test('jumping past the last stop lands on it', () => {
    const lastIndex = effectTour.steps.length - 1
    story(
      update,
      given(touring('effect', 0)),
      message(Message.ClickedTourStep({ stepIndex: lastIndex + 5 })),
      settleSky,
      model(next => {
        expect(next.focus).toEqual(
          Focus.Tour({ tourId: 'effect', stepIndex: lastIndex }),
        )
      }),
    )
  })

  test('time on a journey never runs backwards', () => {
    const { tour, step, stepIndex } = backwardsStop
    const latestSoFar = Array.reduce(
      Array.take(tour.steps, stepIndex + 1),
      0,
      (year, earlier) => Math.max(year, birthYear(earlier.star)),
    )
    story(
      update,
      given(touring(tour.id, 0)),
      message(Message.ClickedTourStep({ stepIndex })),
      settleSky,
      model(next => {
        expect(Math.floor(next.epoch)).toBe(Math.min(latestSoFar, PRESENT))
        expect(next.epoch).toBeGreaterThan(birthYear(step.star) + 1)
      }),
    )
  })

  test('clicking a star on the journey jumps to that stop', () => {
    const lastStep = Array.lastNonEmpty(effectTour.steps)
    const stepIndex = Option.getOrElse(
      Array.findFirstIndex(
        effectTour.steps,
        step => step.star === lastStep.star,
      ),
      () => -1,
    )
    story(
      update,
      given(touring('effect', 0)),
      message(Message.ClickedStar({ starId: lastStep.star })),
      settleSky,
      model(next => {
        expect(next.focus).toEqual(Focus.Tour({ tourId: 'effect', stepIndex }))
      }),
    )
  })

  test('clicking empty sky keeps the journey going', () => {
    story(
      update,
      given(touring('effect', 1)),
      message(Message.ClickedEmptySky()),
      Command.expectNone(),
      model(next => {
        expect(next.focus).toEqual(
          Focus.Tour({ tourId: 'effect', stepIndex: 1 }),
        )
      }),
    )
  })

  test('finishing returns to the whole sky', () => {
    story(
      update,
      given(touring('effect', effectTour.steps.length - 1)),
      message(Message.ClickedFinishTour()),
      settleSky,
      model(next => {
        expect(next.focus).toEqual(Focus.Overview())
      }),
    )
  })
})

describe('time', () => {
  test('watching history starts at the beginning and plays', () => {
    story(
      update,
      given(live),
      message(Message.ClickedWatchHistory()),
      settleSky,
      model(next => {
        expect(next.arrival._tag).toBe('Exploring')
        expect(next.epoch).toBe(FIRST_EPOCH)
        expect(next.playback._tag).toBe('Playing')
      }),
    )
  })

  test('playback advances the year, but a long frame only moves it a little', () => {
    story(
      update,
      given(
        modifyFields(live, {
          epoch: () => 1990,
          playback: () => Playback.Playing(),
        }),
      ),
      message(Message.TickedPlayback({ deltaTime: 40 })),
      settleSky,
      model(next => {
        expect(next.epoch).toBeGreaterThan(1990)
        expect(next.playback._tag).toBe('Playing')
      }),
      message(Message.TickedPlayback({ deltaTime: 4000 })),
      settleSky,
      model(next => {
        expect(next.epoch).toBeLessThan(1991)
      }),
    )
  })

  test('reaching the present pauses', () => {
    story(
      update,
      given(
        modifyFields(live, {
          epoch: () => PRESENT - 0.01,
          playback: () => Playback.Playing(),
        }),
      ),
      message(Message.TickedPlayback({ deltaTime: 40 })),
      settleSky,
      model(next => {
        expect(next.epoch).toBe(PRESENT)
        expect(next.playback._tag).toBe('Paused')
      }),
    )
  })

  test('play at the present starts again from the beginning; now returns', () => {
    story(
      update,
      given(live),
      message(Message.ClickedPlay()),
      settleSky,
      model(next => {
        expect(next.epoch).toBe(FIRST_EPOCH)
        expect(next.playback._tag).toBe('Playing')
      }),
      message(Message.ClickedNow()),
      settleSky,
      model(next => {
        expect(next.epoch).toBe(PRESENT)
        expect(next.playback._tag).toBe('Paused')
      }),
    )
  })
})

describe('traditions', () => {
  test('toggling a tradition hides and then shows it again', () => {
    story(
      update,
      given(live),
      message(Message.ToggledConstellation({ constellation: 'Objects' })),
      settleSky,
      model(next => {
        expect(next.hiddenConstellations).toEqual(['Objects'])
      }),
      message(Message.ToggledConstellation({ constellation: 'Objects' })),
      settleSky,
      model(next => {
        expect(next.hiddenConstellations).toEqual([])
      }),
    )
  })
})
