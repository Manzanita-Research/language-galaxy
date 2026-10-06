import { Array, Option, Order, pipe } from 'effect'

import { ideas } from '../content/ideas'
import { links } from '../content/links'
import { stars } from '../content/stars'
import { tours } from '../content/tours'
import type { Idea } from './idea'
import type { Link } from './link'
import type { Star } from './star'
import type { Tour, TourStep } from './tour'

// INDEX

const indexBy = <A>(
  items: ReadonlyArray<A>,
  key: (item: A) => string,
): ReadonlyMap<string, A> =>
  new Map(Array.map(items, item => [key(item), item] as const))

const groupBy = <A>(
  items: ReadonlyArray<A>,
  key: (item: A) => string,
): ReadonlyMap<string, ReadonlyArray<A>> =>
  new Map(Object.entries(Array.groupBy(items, key)))

const starsById = indexBy(stars, star => star.id)
const ideasById = indexBy(ideas, idea => idea.id)
const toursById = indexBy(tours, tour => tour.id)
const linksByAncestor = groupBy(links, link => link.from)
const linksByDescendant = groupBy(links, link => link.to)

const byYear: Order.Order<Star> = Order.mapInput(
  Order.Number,
  star => star.year,
)

// LOOKUP

export const findStar = (id: string): Option.Option<Star> =>
  Option.fromNullishOr(starsById.get(id))

export const findIdea = (id: string): Option.Option<Idea> =>
  Option.fromNullishOr(ideasById.get(id))

export const findTour = (id: string): Option.Option<Tour> =>
  Option.fromNullishOr(toursById.get(id))

export const findTourStep = (
  tourId: string,
  stepIndex: number,
): Option.Option<Readonly<{ tour: Tour; step: TourStep }>> =>
  pipe(
    findTour(tourId),
    Option.flatMap(tour =>
      Option.map(Array.get(tour.steps, stepIndex), step => ({ tour, step })),
    ),
  )

export const yearOf = (starId: string): Option.Option<number> =>
  Option.map(findStar(starId), star => star.year)

export const ideaName = (id: string): string =>
  Option.match(findIdea(id), {
    onNone: () => id,
    onSome: idea => idea.name,
  })

// LINEAGE

/** Links arriving at a star: what it inherited. */
export const inheritedBy = (starId: string): ReadonlyArray<Link> =>
  linksByDescendant.get(starId) ?? []

/** Links leaving a star: what it passed on. */
export const bequeathedBy = (starId: string): ReadonlyArray<Link> =>
  linksByAncestor.get(starId) ?? []

const byDescendantYear: Order.Order<Link> = Order.mapInput(Order.Number, link =>
  Option.getOrElse(yearOf(link.to), () => 0),
)

const linksByIdea: ReadonlyMap<string, ReadonlyArray<Link>> = new Map(
  Array.map(ideas, idea => [
    idea.id,
    pipe(
      links,
      Array.filter(link => Array.contains(link.ideas, idea.id)),
      Array.sort(byDescendantYear),
    ),
  ]),
)

/** Every hand-off of an idea, in the order its descendants were born. */
export const linksCarrying = (ideaId: string): ReadonlyArray<Link> =>
  linksByIdea.get(ideaId) ?? []

/** The stars that first gave an idea to the galaxy: those that name it
 *  themselves, earliest first. */
export const originsOf = (ideaId: string): ReadonlyArray<Star> =>
  pipe(
    stars,
    Array.filter(star => Array.contains(star.ideas, ideaId)),
    Array.sort(byYear),
  )

export const toursVisiting = (starId: string): ReadonlyArray<Tour> =>
  Array.filter(tours, tour =>
    Array.some(tour.steps, step => step.star === starId),
  )

/** Born recently enough to feel like today. */
const RECENT_YEAR = 2005
/** Landmarks since this year are still in everyday use. */
const STILL_EVERYWHERE_YEAR = 1990

/** Stars a reader is likely to touch this week: recent languages and tools,
 *  newest first. The front door for tracing a lineage backwards. */
export const presentDay: ReadonlyArray<Star> = pipe(
  stars,
  Array.filter(
    star =>
      (star.kind === 'Language' || star.kind === 'Tool') &&
      (star.year >= RECENT_YEAR ||
        (star.magnitude === 1 && star.year >= STILL_EVERYWHERE_YEAR)),
  ),
  Array.sort(Order.flip(byYear)),
)

export { ideas, links, stars, tours }
