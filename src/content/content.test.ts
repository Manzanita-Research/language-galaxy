import { describe, expect, test } from 'vitest'

import type { Star } from '../domain/star'
import { ideas } from './ideas'
import { links } from './links'
import { stars } from './stars'
import { tours } from './tours'

const starsById: ReadonlyMap<string, Star> = new Map(
  stars.map(star => [star.id, star]),
)
const ideaIds: ReadonlySet<string> = new Set(ideas.map(idea => idea.id))

const ROOTS: ReadonlySet<string> = new Set(['field-logic', 'combinatory-logic'])

const TOUR_IDS: ReadonlyArray<string> = [
  'effect',
  'async',
  'lisp-ai',
  'clos',
  'ml-types',
  'react-elm',
  'let-it-crash',
  'proofs',
  'javascript',
]

const wordCount = (text: string): number =>
  text.split(/\s+/).filter(word => word.length > 0).length

describe('stars', () => {
  test('ids are unique', () => {
    expect(starsById.size).toBe(stars.length)
  })

  test('every idea a star carries exists', () => {
    const unknown = stars.flatMap(star =>
      star.ideas
        .filter(idea => !ideaIds.has(idea))
        .map(idea => `${star.id}: ${idea}`),
    )
    expect(unknown).toEqual([])
  })

  test('epithets are eight words or fewer', () => {
    const long = stars
      .filter(star => wordCount(star.epithet) > 8)
      .map(star => star.id)
    expect(long).toEqual([])
  })

  test('every star except the roots and fields has an ancestor', () => {
    const withAncestor = new Set(links.map(link => link.to))
    const orphans = stars
      .filter(
        star =>
          !ROOTS.has(star.id) &&
          star.kind !== 'Field' &&
          !withAncestor.has(star.id),
      )
      .map(star => star.id)
    expect(orphans).toEqual([])
  })

  test('every field passes at least two ideas on', () => {
    const quiet = stars
      .filter(star => star.kind === 'Field')
      .filter(star => links.filter(link => link.from === star.id).length < 2)
      .map(star => star.id)
    expect(quiet).toEqual([])
  })
})

describe('links', () => {
  test('every endpoint is a star', () => {
    const dangling = links
      .flatMap(link => [link.from, link.to])
      .filter(id => !starsById.has(id))
    expect(dangling).toEqual([])
  })

  test('every link carries at least one known idea', () => {
    const bad = links
      .filter(
        link =>
          link.ideas.length === 0 ||
          link.ideas.some(idea => !ideaIds.has(idea)),
      )
      .map(link => `${link.from}->${link.to}`)
    expect(bad).toEqual([])
  })

  test('light only travels forward in time', () => {
    const backwards = links
      .filter(link => {
        const from = starsById.get(link.from)
        const to = starsById.get(link.to)
        return from !== undefined && to !== undefined && from.year > to.year
      })
      .map(link => `${link.from}->${link.to}`)
    expect(backwards).toEqual([])
  })

  test('no link is a self-loop', () => {
    const loops = links.filter(link => link.from === link.to)
    expect(loops).toEqual([])
  })

  test('no pair of stars is linked twice', () => {
    const pairs = links.map(link => `${link.from}->${link.to}`)
    const duplicates = pairs.filter(
      (pair, index) => pairs.indexOf(pair) !== index,
    )
    expect(duplicates).toEqual([])
  })

  test('every idea is carried by at least two links', () => {
    const rare = ideas
      .map(idea => idea.id)
      .filter(id => links.filter(link => link.ideas.includes(id)).length < 2)
    expect(rare).toEqual([])
  })
})

describe('tours', () => {
  test('the tours are exactly the planned ones', () => {
    expect(tours.map(tour => tour.id)).toEqual(TOUR_IDS)
  })

  test('every step visits a real star', () => {
    const unknown = tours.flatMap(tour =>
      tour.steps
        .filter(step => !starsById.has(step.star))
        .map(step => `${tour.id}: ${step.star}`),
    )
    expect(unknown).toEqual([])
  })

  test('each tour has six to ten steps', () => {
    const offLength = tours
      .filter(tour => tour.steps.length < 6 || tour.steps.length > 10)
      .map(tour => `${tour.id}: ${tour.steps.length}`)
    expect(offLength).toEqual([])
  })

  test('no tour visits the same star twice (stops are keyed by star)', () => {
    const repeated = tours.filter(
      tour =>
        new Set(tour.steps.map(step => step.star)).size !== tour.steps.length,
    )
    expect(repeated.map(tour => tour.id)).toEqual([])
  })

  test('each step has at most two snippets', () => {
    const crowded = tours.flatMap(tour =>
      tour.steps
        .filter(step => step.snippets.length > 2)
        .map(step => `${tour.id}: ${step.star}`),
    )
    expect(crowded).toEqual([])
  })
})
