import { Array, Option } from 'effect'
import * as d from 'typegpu/data'

import { findStar, links, stars, yearOf } from '../domain/catalogue'
import { constellationOrder, constellations } from '../domain/constellation'
import { type Rgb, hexToLinear } from '../domain/palette'
import type { Star } from '../domain/star'
import { type Placement, layoutGalaxy, polarToWorld, toRadians } from './layout'

const SIZE_BY_MAGNITUDE: ReadonlyArray<number> = [5.2, 3.7, 2.7]
const FIELD_SIZE = 3.4
const NEBULA_RADIUS_BY_MAGNITUDE: ReadonlyArray<number> = [0.2, 0.15, 0.11]
const SMALLEST_NEBULA = 0.11
/** Arcs bow less the further apart their ends are, up to this angle. */
const BEND_ANGLE_CAP = 2.4
const BEND_PER_RADIAN = 0.12
/** Spreads filament pulse phases evenly (the golden ratio). */
const PHASE_STEP = 0.618034
/** Neighbouring traditions tint their wedge more faintly. */
const NEIGHBOUR_WEDGE_WEIGHT = 0.7
const KIND_CODE = { Field: 0, Theory: 1, Language: 2, Tool: 3 } as const
const FALLBACK_COLOR: Rgb = [0.8, 0.8, 0.9]

/** Pixel radius of a star's core at zoom 1, before emphasis. */
export const starSize = (star: Star): number =>
  star.kind === 'Field'
    ? FIELD_SIZE
    : (SIZE_BY_MAGNITUDE[star.magnitude - 1] ?? FIELD_SIZE)

export const starColor = (star: Star): Rgb =>
  hexToLinear(constellations[star.constellation].color)

export const nebulaRadius = (star: Star): number =>
  NEBULA_RADIUS_BY_MAGNITUDE[star.magnitude - 1] ?? SMALLEST_NEBULA

/** Arcs bow toward the circular direction between their ends, so lineages
 *  read as orbits around the core rather than straight chords. */
const bendOf = (from: Placement, to: Placement): readonly [number, number] => {
  const delta = Math.atan2(
    Math.sin(to.angle - from.angle),
    Math.cos(to.angle - from.angle),
  )
  const radius =
    ((from.radius + to.radius) / 2) *
    (1 - Math.min(Math.abs(delta), BEND_ANGLE_CAP) * BEND_PER_RADIAN)
  return polarToWorld(radius, from.angle + delta / 2)
}

/** Everything static the GPU needs: placements, per-star and per-link
 *  records in TypeGPU's shapes, the field nebulae and the tradition wedges. */
export const buildSkyData = () => {
  const placements = layoutGalaxy(stars, links)
  const placementOf = (id: string): Placement =>
    placements.get(id) ?? { id, x: 0, y: 0, radius: 0, angle: 0 }
  const colorOf = (id: string): Rgb =>
    Option.match(findStar(id), {
      onNone: () => FALLBACK_COLOR,
      onSome: starColor,
    })
  const yearOfId = (id: string): number => Option.getOrElse(yearOf(id), () => 0)

  const starRecords = Array.map(stars, star => {
    const placement = placementOf(star.id)
    const [red, green, blue] = starColor(star)
    return {
      position: d.vec2f(placement.x, placement.y),
      size: starSize(star),
      year: star.year,
      color: d.vec3f(red, green, blue),
      kind: KIND_CODE[star.kind],
    }
  })

  const linkRecords = Array.map(links, (link, index) => {
    const from = placementOf(link.from)
    const to = placementOf(link.to)
    const [bendX, bendY] = bendOf(from, to)
    const [fromRed, fromGreen, fromBlue] = colorOf(link.from)
    const [toRed, toGreen, toBlue] = colorOf(link.to)
    return {
      origin: d.vec2f(from.x, from.y),
      destination: d.vec2f(to.x, to.y),
      bend: d.vec2f(bendX, bendY),
      originYear: yearOfId(link.from),
      destinationYear: yearOfId(link.to),
      originColor: d.vec3f(fromRed, fromGreen, fromBlue),
      echo: link.kind === 'Echo' ? 1 : 0,
      destinationColor: d.vec3f(toRed, toGreen, toBlue),
      seed: (index * PHASE_STEP) % 1,
    }
  })

  const sectorRecords = Array.map(constellationOrder, constellation => {
    const info = constellations[constellation]
    const [red, green, blue] = hexToLinear(info.color)
    return {
      angle: toRadians(info.angle),
      spread: toRadians(info.spread),
      weight: info.isFunctional ? 1 : NEIGHBOUR_WEDGE_WEIGHT,
      color: d.vec3f(red, green, blue),
    }
  })

  return {
    placementOf,
    starRecords,
    linkRecords,
    sectorRecords,
    fields: Array.filter(stars, star => star.kind === 'Field'),
  }
}

export type SkyData = ReturnType<typeof buildSkyData>
