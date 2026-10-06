import { Array } from 'effect'
import { describe, expect, test } from 'vitest'

import { links, stars } from '../domain/catalogue'
import { constellations } from '../domain/constellation'
import { layoutGalaxy, radiusOfYear } from './layout'

const placements = layoutGalaxy(stars, links)

const angularDistance = (a: number, b: number): number =>
  Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))

describe('layout', () => {
  test('later years sit further from the core', () => {
    expect(radiusOfYear(1936)).toBeLessThan(radiusOfYear(1973))
    expect(radiusOfYear(1973)).toBeLessThan(radiusOfYear(2020))
    expect(radiusOfYear(2020)).toBeLessThanOrEqual(1)
  })

  test('every star is placed at the radius of its birth year', () => {
    Array.forEach(stars, star => {
      expect(placements.get(star.id)?.radius).toBeCloseTo(
        radiusOfYear(star.year),
        6,
      )
    })
  })

  test('stars stay inside their tradition’s wedge', () => {
    Array.forEach(
      Array.filter(stars, star => star.constellation !== 'Foundations'),
      star => {
        const info = constellations[star.constellation]
        const angle = placements.get(star.id)?.angle ?? Infinity
        expect(
          angularDistance(angle, (info.angle * Math.PI) / 180),
        ).toBeLessThanOrEqual(((info.spread * 1.08 + 0.01) * Math.PI) / 180)
      },
    )
  })

  test('layout is deterministic', () => {
    const again = layoutGalaxy(stars, links)
    Array.forEach(stars, star => {
      expect(again.get(star.id)).toEqual(placements.get(star.id))
    })
  })
})
