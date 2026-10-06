import { Array, Option, pipe } from 'effect'

import {
  bequeathedBy,
  findTourStep,
  inheritedBy,
  links,
  linksCarrying,
  originsOf,
  stars,
} from './catalogue'
import { Focus } from './focus'
import { type Link, linkId } from './link'

/** `tint` colours the glow by direction: -1 warm for ancestry (light that
 *  arrived), +1 cool for descendants (light sent on), 0 neutral. `flow`
 *  animates pulses travelling from ancestor to descendant. */
export type Glow = Readonly<{ level: number; tint: number; flow: number }>

export type Illumination = Readonly<{
  stars: ReadonlyMap<string, Glow>
  links: ReadonlyMap<string, Glow>
  /** The stars at the centre of attention, labelled and haloed. */
  focusedStarIds: ReadonlySet<string>
  /** The idea whose colour lit filaments should take, if one is followed. */
  maybeIdeaId: Option.Option<string>
  /** How strongly unlit things recede: 0 in the overview, 1 when focused. */
  dimming: number
}>

const WARM = -1
const NEUTRAL = 0
const COOL = 1

const RESTING_LEVEL = 1
const DIM_LEVEL = 0.14
/** Glow level of the star at the centre of attention; the sky draws its
 *  halo at this brightness. */
export const FOCUSED_LEVEL = 1.7
const NEAREST_KIN_LEVEL = 1.3
const KIN_FADE_PER_GENERATION = 0.11
const DISTANT_KIN_LEVEL = 0.5
const IDEA_CARRIER_LEVEL = 1.15
const IDEA_LINK_LEVEL = 1.35
const TOUR_VISITED_LEVEL = 1.2
const TOUR_AHEAD_LEVEL = 0.7
const TOUR_NEIGHBOUR_LEVEL = 0.75
const TOUR_NEIGHBOUR_LINK_LEVEL = 0.7
const TOUR_PATH_LINK_LEVEL = 1.4

const RESTING: Glow = { level: RESTING_LEVEL, tint: NEUTRAL, flow: 0 }
const DIM: Glow = { level: DIM_LEVEL, tint: NEUTRAL, flow: 0 }
const FOCUSED: Glow = { level: FOCUSED_LEVEL, tint: NEUTRAL, flow: 0 }

const still = (level: number, tint: number = NEUTRAL): Glow => ({
  level,
  tint,
  flow: 0,
})

const flowing = (level: number, tint: number = NEUTRAL): Glow => ({
  level,
  tint,
  flow: 1,
})

const glowEntry = (id: string, glow: Glow): readonly [string, Glow] => [
  id,
  glow,
]

/** Breadth-first generations outward from a star, through `next`. */
const generations = (
  startId: string,
  next: (id: string) => ReadonlyArray<string>,
): ReadonlyMap<string, number> => {
  const step = (
    frontier: ReadonlyArray<string>,
    seen: ReadonlyMap<string, number>,
    depth: number,
  ): ReadonlyMap<string, number> =>
    Array.match(frontier, {
      onEmpty: () => seen,
      onNonEmpty: current => {
        const discovered = pipe(
          current,
          Array.flatMap(next),
          Array.dedupe,
          Array.filter(id => id !== startId && !seen.has(id)),
        )
        return step(
          discovered,
          new Map([
            ...seen,
            ...Array.map(discovered, id => [id, depth] as const),
          ]),
          depth + 1,
        )
      },
    })
  return step([startId], new Map(), 1)
}

export const ancestryOf = (starId: string): ReadonlyMap<string, number> =>
  generations(starId, id => Array.map(inheritedBy(id), link => link.from))

export const descendantsOf = (starId: string): ReadonlyMap<string, number> =>
  generations(starId, id => Array.map(bequeathedBy(id), link => link.to))

/** Near kin glow brightest; distant ancestors fade but never vanish. */
const kinLevel = (generation: number): number =>
  Math.max(
    DISTANT_KIN_LEVEL,
    NEAREST_KIN_LEVEL - KIN_FADE_PER_GENERATION * generation,
  )

const overview: Illumination = {
  stars: new Map(),
  links: new Map(),
  focusedStarIds: new Set(),
  maybeIdeaId: Option.none(),
  dimming: 0,
}

const illuminateStar = (starId: string): Illumination => {
  const ancestry = ancestryOf(starId)
  const descendants = descendantsOf(starId)
  const isAncestralLink = (link: Link) =>
    ancestry.has(link.from) && (link.to === starId || ancestry.has(link.to))
  const isDescendantLink = (link: Link) =>
    descendants.has(link.to) &&
    (link.from === starId || descendants.has(link.from))
  return {
    stars: new Map([
      ...Array.map([...ancestry], ([id, generation]) =>
        glowEntry(id, still(kinLevel(generation), WARM)),
      ),
      ...Array.map([...descendants], ([id, generation]) =>
        glowEntry(id, still(kinLevel(generation), COOL)),
      ),
      glowEntry(starId, FOCUSED),
    ]),
    links: new Map([
      ...Array.map(Array.filter(links, isAncestralLink), link =>
        glowEntry(
          linkId(link),
          flowing(kinLevel((ancestry.get(link.from) ?? 1) - 1), WARM),
        ),
      ),
      ...Array.map(Array.filter(links, isDescendantLink), link =>
        glowEntry(
          linkId(link),
          flowing(kinLevel((descendants.get(link.to) ?? 1) - 1), COOL),
        ),
      ),
    ]),
    focusedStarIds: new Set([starId]),
    maybeIdeaId: Option.none(),
    dimming: 1,
  }
}

const illuminateIdea = (ideaId: string): Illumination => {
  const carriers = linksCarrying(ideaId)
  const origins = originsOf(ideaId)
  const firstYear = Option.match(Array.head(origins), {
    onNone: () => Infinity,
    onSome: star => star.year,
  })
  const firstOrigins = Array.filter(origins, star => star.year <= firstYear)
  const touched = new Set([
    ...Array.flatMap(carriers, link => [link.from, link.to]),
    ...Array.map(origins, star => star.id),
  ])
  return {
    stars: new Map([
      ...Array.map(
        Array.filter(stars, star => touched.has(star.id)),
        star => glowEntry(star.id, still(IDEA_CARRIER_LEVEL)),
      ),
      ...Array.map(firstOrigins, star => glowEntry(star.id, FOCUSED)),
    ]),
    links: new Map(
      Array.map(carriers, link =>
        glowEntry(linkId(link), flowing(IDEA_LINK_LEVEL)),
      ),
    ),
    focusedStarIds: new Set(Array.map(firstOrigins, star => star.id)),
    maybeIdeaId: Option.some(ideaId),
    dimming: 1,
  }
}

/** An unordered pair, so a journey lights the filament between two stops
 *  whichever way the light flowed. */
const pairKey = (first: string, second: string): string =>
  first < second ? `${first}|${second}` : `${second}|${first}`

const illuminateTour = (tourId: string, stepIndex: number): Illumination =>
  Option.match(findTourStep(tourId, stepIndex), {
    onNone: () => overview,
    onSome: ({ tour, step }) => {
      const currentId = step.star
      const path = Array.map(tour.steps, tourStep => tourStep.star)
      const pathPairs = new Set(
        Array.map(Array.zip(path, Array.drop(path, 1)), ([earlier, later]) =>
          pairKey(earlier, later),
        ),
      )
      const neighbourLinks = [
        ...inheritedBy(currentId),
        ...bequeathedBy(currentId),
      ]
      return {
        stars: new Map([
          ...Array.map(neighbourLinks, link =>
            glowEntry(
              link.from === currentId ? link.to : link.from,
              still(TOUR_NEIGHBOUR_LEVEL),
            ),
          ),
          ...Array.map(path, (id, index) =>
            glowEntry(
              id,
              still(index <= stepIndex ? TOUR_VISITED_LEVEL : TOUR_AHEAD_LEVEL),
            ),
          ),
          glowEntry(currentId, FOCUSED),
        ]),
        links: new Map([
          ...Array.map(neighbourLinks, link =>
            glowEntry(
              linkId(link),
              flowing(
                TOUR_NEIGHBOUR_LINK_LEVEL,
                link.from === currentId ? COOL : WARM,
              ),
            ),
          ),
          ...Array.map(
            Array.filter(links, link =>
              pathPairs.has(pairKey(link.from, link.to)),
            ),
            link => glowEntry(linkId(link), flowing(TOUR_PATH_LINK_LEVEL)),
          ),
        ]),
        focusedStarIds: new Set([currentId]),
        maybeIdeaId: Option.none(),
        dimming: 1,
      }
    },
  })

export const illuminate = (focus: Focus): Illumination =>
  Focus.match(focus, {
    Overview: () => overview,
    Star: ({ starId }) => illuminateStar(starId),
    Idea: ({ ideaId }) => illuminateIdea(ideaId),
    Tour: ({ tourId, stepIndex }) => illuminateTour(tourId, stepIndex),
  })

export const glowOf = (
  glows: ReadonlyMap<string, Glow>,
  id: string,
  dimming: number,
): Glow => glows.get(id) ?? (dimming > 0 ? DIM : RESTING)
