import { Array, Option } from 'effect'

import { links, stars } from '../domain/catalogue'
import type { Constellation } from '../domain/constellation'
import { type Illumination, glowOf } from '../domain/illumination'
import { linkId } from '../domain/link'
import { ideaColor } from '../domain/palette'
import type { Star } from '../domain/star'
import type { GlowBuffers } from './renderer'
import { type SkyData, nebulaRadius, starColor } from './skyData'

/** Per star: level, tint, hover, visibility. */
const STAR_WIDTH = 4
const STAR_LEVEL = 0
const STAR_VISIBILITY = 3
/** Per link: level, tint, flow, visibility, then thread rgb and its mix. */
const LINK_WIDTH = 8
/** Per field: position, radius, year, rgb, glow. */
const NEBULA_WIDTH = 8
const NEBULA_GLOW = 7
const DIMMED_LINK_LEVEL = 0.08
const THREAD_COLOR_MIX = 0.85
const NEBULA_RESTING_GLOW = 0.35
const NEBULA_GLOW_PER_LEVEL = 0.75
/** Eased visibility above this counts as shown. */
const SHOWN = 0.5

export type GlowTarget = Readonly<{
  illumination: Illumination
  hidden: ReadonlySet<Constellation>
  maybeHoveredIndex: Option.Option<number>
}>

export type GlowState = Readonly<{
  /** Set what every star, filament and nebula should glow toward. */
  aim: (target: GlowTarget) => void
  /** Move the shown glow a fraction of the way toward its aim. */
  ease: (amount: number) => void
  buffers: GlowBuffers
  isShown: (starIndex: number) => boolean
  levelOf: (starIndex: number) => number
}>

const easeToward = (
  shown: Float32Array,
  wanted: Float32Array,
  amount: number,
): void =>
  Array.forEach(Array.range(0, shown.length - 1), index => {
    const value = shown[index] ?? 0
    shown[index] = value + ((wanted[index] ?? value) - value) * amount
  })

/** The sky's glow, eased on the CPU and uploaded whole each frame. */
export const createGlowState = (data: SkyData): GlowState => {
  const starsShown = new Float32Array(stars.length * STAR_WIDTH)
  const starsWanted = new Float32Array(stars.length * STAR_WIDTH)
  const linksShown = new Float32Array(links.length * LINK_WIDTH)
  const linksWanted = new Float32Array(links.length * LINK_WIDTH)
  const nebulae = new Float32Array(
    Math.max(data.fields.length, 1) * NEBULA_WIDTH,
  )
  const starIndexById = new Map(
    Array.map(stars, (star, index) => [star.id, index] as const),
  )
  let target: GlowTarget = {
    illumination: {
      stars: new Map(),
      links: new Map(),
      focusedStarIds: new Set(),
      maybeIdeaId: Option.none(),
      dimming: 0,
    },
    hidden: new Set(),
    maybeHoveredIndex: Option.none(),
  }

  const wantedVisibility = (starId: string): number =>
    starsWanted[
      (starIndexById.get(starId) ?? 0) * STAR_WIDTH + STAR_VISIBILITY
    ] ?? 0

  const fieldGlow = (field: Star): number =>
    target.hidden.has(field.constellation)
      ? 0
      : NEBULA_RESTING_GLOW +
        glowOf(target.illumination.stars, field.id, target.illumination.dimming)
          .level *
          NEBULA_GLOW_PER_LEVEL

  const aim = (next: GlowTarget) => {
    target = next
    const { illumination, hidden, maybeHoveredIndex } = next
    const maybeThreadColor = Option.map(illumination.maybeIdeaId, ideaColor)
    const [red, green, blue] = Option.getOrElse(
      maybeThreadColor,
      () => [0, 0, 0] as const,
    )
    Array.forEach(stars, (star, index) => {
      const glow = glowOf(illumination.stars, star.id, illumination.dimming)
      starsWanted.set(
        [
          glow.level,
          glow.tint,
          Option.contains(maybeHoveredIndex, index) ? 1 : 0,
          hidden.has(star.constellation) ? 0 : 1,
        ],
        index * STAR_WIDTH,
      )
    })
    Array.forEach(links, (link, index) => {
      const id = linkId(link)
      const glow = glowOf(illumination.links, id, illumination.dimming)
      const isLit = illumination.links.has(id)
      linksWanted.set(
        [
          illumination.dimming > 0 && !isLit ? DIMMED_LINK_LEVEL : glow.level,
          glow.tint,
          glow.flow,
          wantedVisibility(link.from) * wantedVisibility(link.to),
          red,
          green,
          blue,
          Option.isSome(maybeThreadColor) && isLit ? THREAD_COLOR_MIX : 0,
        ],
        index * LINK_WIDTH,
      )
    })
  }

  const ease = (amount: number) => {
    easeToward(starsShown, starsWanted, amount)
    easeToward(linksShown, linksWanted, amount)
    Array.forEach(data.fields, (field, index) => {
      const placement = data.placementOf(field.id)
      const [red, green, blue] = starColor(field)
      const offset = index * NEBULA_WIDTH
      const current = nebulae[offset + NEBULA_GLOW] ?? 1
      nebulae.set(
        [
          placement.x,
          placement.y,
          nebulaRadius(field),
          field.year,
          red,
          green,
          blue,
          current + (fieldGlow(field) - current) * amount,
        ],
        offset,
      )
    })
  }

  return {
    aim,
    ease,
    buffers: { stars: starsShown, links: linksShown, nebulae },
    isShown: index =>
      (starsShown[index * STAR_WIDTH + STAR_VISIBILITY] ?? 0) > SHOWN,
    levelOf: index => starsShown[index * STAR_WIDTH + STAR_LEVEL] ?? 1,
  }
}

/** Start the shown glow exactly at its aim, so the first frame doesn't fade
 *  in from nothing. */
export const settleGlow = (glow: GlowState): void => glow.ease(1)
