import { Array, Option, pipe } from 'effect'

import { findStar, findTour, yearOf } from './catalogue'

/** The sky's clock runs from just before Church's λ-calculus to now. */
export const FIRST_EPOCH = 1924
export const PRESENT = 2026

/** How far past a star's birth year the sky must be to show it clearly. */
const REVEAL_MARGIN_YEARS = 0.6

const revealing = (year: number): number =>
  Math.min(year + REVEAL_MARGIN_YEARS, PRESENT)

/** On a journey, time only moves forward: the sky shows the world as of the
 *  latest stop reached so far. */
export const epochForTourStep = (tourId: string, stepIndex: number): number =>
  Option.match(findTour(tourId), {
    onNone: () => PRESENT,
    onSome: tour =>
      pipe(
        Array.take(tour.steps, stepIndex + 1),
        Array.map(step => findStar(step.star)),
        Array.getSomes,
        Array.reduce(FIRST_EPOCH, (latest, star) =>
          Math.max(latest, star.year),
        ),
        revealing,
      ),
  })

/** The epoch needed to see a star: unchanged if it's already born. */
export const epochToReveal = (epoch: number, starId: string): number =>
  Option.match(yearOf(starId), {
    onNone: () => epoch,
    onSome: year => Math.max(epoch, revealing(year)),
  })
