import { Array, Number, Option } from 'effect'

import { ideas } from '../content/ideas'

/** Linear-light RGB, each channel 0–1, ready for the GPU. */
export type Rgb = readonly [number, number, number]

const decode = (channel: number): number =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4

const encode = (channel: number): number =>
  channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055

/** Encoded sRGB hex in, linear light out. */
export const hexToLinear = (hex: string): Rgb => {
  const value = Option.getOrElse(Number.parse(hex.replace('#', '0x')), () => 0)
  return [
    decode(((value >> 16) & 255) / 255),
    decode(((value >> 8) & 255) / 255),
    decode((value & 255) / 255),
  ]
}

const unit = (channel: number): number =>
  Number.clamp(channel, { minimum: 0, maximum: 1 })

const linearToHex = (rgb: Rgb): string =>
  `#${Array.join(
    Array.map(rgb, channel =>
      Math.round(unit(encode(channel)) * 255)
        .toString(16)
        .padStart(2, '0'),
    ),
    '',
  )}`

const oklchToLinear = (
  lightness: number,
  chroma: number,
  hueDegrees: number,
): Rgb => {
  const hue = (hueDegrees * Math.PI) / 180
  const a = chroma * Math.cos(hue)
  const b = chroma * Math.sin(hue)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    unit(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    unit(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    unit(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}

/** Idea threads walk the hue wheel by the golden angle, skipping the acid
 *  greens so every thread stays inside Jem's pink, violet, aqua, pearl and
 *  gold. */
const GREEN_BAND_START = 100
const GREEN_BAND_WIDTH = 70
const HUE_ORIGIN = 345
const GOLDEN_ANGLE = 137.508
const IDEA_LIGHTNESS = 0.8
const IDEA_CHROMA = 0.14

const ideaHue = (index: number): number => {
  const usable = 360 - GREEN_BAND_WIDTH
  const step = (index * GOLDEN_ANGLE) % usable
  const hue = (HUE_ORIGIN + step) % 360
  return hue >= GREEN_BAND_START && hue < GREEN_BAND_START + GREEN_BAND_WIDTH
    ? hue + GREEN_BAND_WIDTH
    : hue
}

const ideaColors: ReadonlyMap<string, Rgb> = new Map(
  Array.map(
    ideas,
    (idea, index) =>
      [
        idea.id,
        oklchToLinear(IDEA_LIGHTNESS, IDEA_CHROMA, ideaHue(index)),
      ] as const,
  ),
)

const PEARL: Rgb = [0.83, 0.81, 0.86]

export const ideaColor = (ideaId: string): Rgb =>
  ideaColors.get(ideaId) ?? PEARL

export const ideaColorHex = (ideaId: string): string =>
  linearToHex(ideaColor(ideaId))
