import { Array, Option } from 'effect'
import { describe, expect, test } from 'vitest'

import type { Star } from '../domain/star'
import { type PickingView, pickStar } from './picking'

const star = (id: string, year: number): Star => ({
  id,
  name: id,
  kind: 'Language',
  constellation: 'Lisp',
  year,
  people: '',
  epithet: '',
  blurb: '',
  ideas: [],
  magnitude: 1,
})

const positions = new Map([
  ['lisp', 100],
  ['scheme', 104],
  ['clojure', 400],
])

const view = (overrides: Partial<PickingView> = {}): PickingView => ({
  stars: [star('lisp', 1958), star('scheme', 1975), star('clojure', 2007)],
  screenOf: picked => [positions.get(picked.id) ?? 0, 100],
  zoom: 1,
  epoch: 2026,
  isHidden: () => false,
  ...overrides,
})

const pickedId = (picking: PickingView, x: number): Option.Option<string> =>
  Option.flatMap(pickStar(picking, x, 100), index =>
    Option.map(Array.get(picking.stars, index), picked => picked.id),
  )

describe('picking', () => {
  test('picks the nearest star under the pointer', () => {
    expect(pickedId(view(), 105)).toEqual(Option.some('scheme'))
    expect(pickedId(view(), 99)).toEqual(Option.some('lisp'))
  })

  test('empty sky picks nothing', () => {
    expect(pickedId(view(), 250)).toEqual(Option.none())
  })

  test('stars not yet born cannot be picked', () => {
    expect(pickedId(view({ epoch: 1960 }), 104)).toEqual(Option.some('lisp'))
    expect(pickedId(view({ epoch: 1960 }), 400)).toEqual(Option.none())
  })

  test('hidden traditions cannot be picked', () => {
    expect(
      pickedId(view({ isHidden: picked => picked.id === 'clojure' }), 400),
    ).toEqual(Option.none())
  })
})
