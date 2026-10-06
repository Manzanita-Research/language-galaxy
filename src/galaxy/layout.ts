import { Array, Number, Option } from 'effect'

import { type Constellation, constellations } from '../domain/constellation'
import type { Link } from '../domain/link'
import type { Star } from '../domain/star'

/** The chart's time axis runs a little wider than the sky's clock
 *  (`FIRST_EPOCH`–`PRESENT`) so the core and the rim keep some breathing
 *  room. */
export const FIRST_YEAR = 1920
export const LAST_YEAR = 2027
/** The λ core is drawn as a disc; time starts at its edge. */
export const CORE_RADIUS = 0.05

const TAU = Math.PI * 2

export const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

export const radiusOfYear = (year: number): number =>
  CORE_RADIUS +
  ((1 - CORE_RADIUS) *
    (Number.clamp(year, { minimum: FIRST_YEAR, maximum: LAST_YEAR }) -
      FIRST_YEAR)) /
    (LAST_YEAR - FIRST_YEAR)

/** World space: the galaxy has radius 1, +x right, +y down, angle 0 at the
 *  top and increasing clockwise, matching how a reader scans a clock face. */
export const polarToWorld = (
  radius: number,
  angle: number,
): readonly [number, number] => [
  radius * Math.sin(angle),
  -radius * Math.cos(angle),
]

export type Placement = Readonly<{
  id: string
  x: number
  y: number
  radius: number
  angle: number
}>

const SEPARATION_BY_MAGNITUDE: ReadonlyArray<number> = [0.05, 0.04, 0.032]
const FIELD_SEPARATION = 0.05
const RELAXATION_STEPS = 360
/** Keeps the last steps gentle so the layout settles rather than jitters. */
const RELAXATION_TAIL = 40
const INITIAL_SPREAD = 1.2
const HOME_PULL = 0.02
const ANCESTOR_PULL = 0.025
const FOUNDATION_ANCESTOR_PULL = 0.04
const PUSH_STRENGTH = 0.5
/** Stars near the core push in larger angular steps; this caps that. */
const INNERMOST_RADIUS = 0.08
const WEDGE_OVERFLOW = 1.08
const FNV_OFFSET = 2166136261
const FNV_PRIME = 16777619
const HASH_BUCKETS = 100000

const wrapAngle = (angle: number): number =>
  angle - TAU * Math.round(angle / TAU)

/** A stable pseudo-random number in [0, 1) from a string (FNV-1a). */
const hashUnit = (text: string): number => {
  const hash = Array.reduce(
    Array.fromIterable(text),
    FNV_OFFSET,
    (accumulator, character) =>
      Math.imul(accumulator ^ character.charCodeAt(0), FNV_PRIME),
  )
  return ((hash >>> 0) % HASH_BUCKETS) / HASH_BUCKETS
}

const wedgeOf = (constellation: Constellation) => {
  const info = constellations[constellation]
  return { centre: toRadians(info.angle), spread: toRadians(info.spread) }
}

/** Minimum distance between neighbours, in world units. */
const separationOf = (star: Star): number =>
  star.kind === 'Field'
    ? FIELD_SEPARATION
    : (SEPARATION_BY_MAGNITUDE[star.magnitude - 1] ?? FIELD_SEPARATION)

type Body = Readonly<{
  star: Star
  radius: number
  angle: number
  separation: number
}>

const initialBody = (star: Star): Body => {
  const wedge = wedgeOf(star.constellation)
  return {
    star,
    radius: radiusOfYear(star.year),
    angle:
      wedge.centre + (hashUnit(star.id) - 0.5) * INITIAL_SPREAD * wedge.spread,
    separation: separationOf(star),
  }
}

const circularMean = (angles: ReadonlyArray<number>): number =>
  Math.atan2(
    Array.reduce(angles, 0, (sum, angle) => sum + Math.sin(angle)),
    Array.reduce(angles, 0, (sum, angle) => sum + Math.cos(angle)),
  )

/** How hard `other` pushes `body` around the circle: only when they sit at
 *  a similar radius and their chord is shorter than their joint spacing. */
const pushFrom = (
  body: Body,
  bodyIndex: number,
  other: Body,
  otherIndex: number,
): number => {
  const reach = (body.separation + other.separation) / 2
  const radialGap = Math.abs(body.radius - other.radius)
  const delta = wrapAngle(body.angle - other.angle)
  const chord = Math.hypot(
    Math.abs(delta) * Math.min(body.radius, other.radius),
    radialGap,
  )
  if (otherIndex === bodyIndex || radialGap >= reach || chord >= reach) {
    return 0
  }
  const direction =
    delta === 0 ? (bodyIndex < otherIndex ? -1 : 1) : Math.sign(delta)
  return (direction * (reach - chord)) / Math.max(body.radius, INNERMOST_RADIUS)
}

const ancestorPullOf = (body: Body, parents: ReadonlyArray<Body>): number =>
  Array.match(parents, {
    onEmpty: () => 0,
    onNonEmpty: nonEmpty =>
      wrapAngle(
        circularMean(Array.map(nonEmpty, parent => parent.angle)) - body.angle,
      ) *
      (body.star.constellation === 'Foundations'
        ? FOUNDATION_ANCESTOR_PULL
        : ANCESTOR_PULL),
  })

/** One relaxation step: every body is pulled toward its wedge centre and its
 *  ancestors, and pushed away from bodies at a similar radius. Foundations
 *  belong to every tradition, so they float free of any wedge. */
const relax =
  (parentIndices: ReadonlyArray<ReadonlyArray<number>>, strength: number) =>
  (bodies: ReadonlyArray<Body>): ReadonlyArray<Body> =>
    Array.map(bodies, (body, index) => {
      const wedge = wedgeOf(body.star.constellation)
      const isFoundation = body.star.constellation === 'Foundations'
      const homePull = isFoundation
        ? 0
        : wrapAngle(wedge.centre - body.angle) * HOME_PULL
      const parents = Array.getSomes(
        Array.map(parentIndices[index] ?? [], parentIndex =>
          Array.get(bodies, parentIndex),
        ),
      )
      const push = Array.reduce(
        bodies,
        0,
        (total, other, otherIndex) =>
          total + pushFrom(body, index, other, otherIndex),
      )
      const unclamped =
        body.angle +
        (homePull + ancestorPullOf(body, parents) + push * PUSH_STRENGTH) *
          strength
      const limit = wedge.spread * WEDGE_OVERFLOW
      const angle = isFoundation
        ? unclamped
        : wedge.centre +
          Number.clamp(wrapAngle(unclamped - wedge.centre), {
            minimum: -limit,
            maximum: limit,
          })
      return { ...body, angle }
    })

/** Place every star: radius by birth year, angle by tradition, relaxed so
 *  none collide and lineages read as short arcs. Deterministic. */
export const layoutGalaxy = (
  stars: ReadonlyArray<Star>,
  links: ReadonlyArray<Link>,
): ReadonlyMap<string, Placement> => {
  const indexById = new Map(
    Array.map(stars, (star, index) => [star.id, index] as const),
  )
  const parentIndices = Array.map(stars, star =>
    Array.getSomes(
      Array.map(
        Array.filter(links, link => link.to === star.id),
        link => Option.fromNullishOr(indexById.get(link.from)),
      ),
    ),
  )
  const unsettled: ReadonlyArray<Body> = Array.map(stars, initialBody)
  const settled = Array.reduce(
    Array.range(1, RELAXATION_STEPS),
    unsettled,
    (bodies, step) =>
      relax(
        parentIndices,
        1 - step / (RELAXATION_STEPS + RELAXATION_TAIL),
      )(bodies),
  )
  return new Map(
    Array.map(settled, body => {
      const [x, y] = polarToWorld(body.radius, body.angle)
      return [
        body.star.id,
        { id: body.star.id, x, y, radius: body.radius, angle: body.angle },
      ] as const
    }),
  )
}
