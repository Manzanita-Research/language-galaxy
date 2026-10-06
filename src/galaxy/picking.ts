import { Array, Option, pipe } from 'effect'

import type { Star } from '../domain/star'
import { isBorn, zoomBoost } from './shaders'
import { starSize } from './skyData'

/** Minimum click radius around a star, in CSS pixels. */
const STAR_REACH = 11
const FIELD_REACH = 18
/** Click radius as a multiple of the star's drawn core. */
const REACH_PER_SIZE = 2.4

export type PickingView = Readonly<{
  stars: ReadonlyArray<Star>
  screenOf: (star: Star) => readonly [number, number]
  zoom: number
  epoch: number
  isHidden: (star: Star) => boolean
}>

/** The star under a point, if any: the nearest visible star whose drawn
 *  size, grown with zoom exactly as the shader grows it, covers the point.
 *  What you click is what you see. */
export const pickStar = (
  view: PickingView,
  x: number,
  y: number,
): Option.Option<number> =>
  pipe(
    Array.map(view.stars, (star, index) => {
      const [starX, starY] = view.screenOf(star)
      return {
        index,
        star,
        distance: Math.hypot(starX - x, starY - y),
        reach: Math.max(
          star.kind === 'Field' ? FIELD_REACH : STAR_REACH,
          starSize(star) * zoomBoost(view.zoom) * REACH_PER_SIZE,
        ),
      }
    }),
    Array.filter(
      candidate =>
        isBorn(candidate.star.year, view.epoch) &&
        !view.isHidden(candidate.star) &&
        candidate.distance <= candidate.reach,
    ),
    Array.match({
      onEmpty: () => Option.none(),
      onNonEmpty: candidates =>
        Option.some(
          Array.reduce(
            candidates,
            Array.headNonEmpty(candidates),
            (best, candidate) =>
              candidate.distance < best.distance ? candidate : best,
          ).index,
        ),
    }),
  )
