import { Array, Option } from 'effect'
import { describe, expect, test } from 'vitest'

import { linksCarrying } from './catalogue'
import { Focus } from './focus'
import { ancestryOf, descendantsOf, illuminate } from './illumination'
import { linkId } from './link'

describe('illumination', () => {
  test('Effect’s ancestry reaches back to the λ-calculus', () => {
    expect(ancestryOf('effect').has('lambda-calculus')).toBe(true)
  })

  test('Lisp’s descendants reach the present', () => {
    expect(descendantsOf('lisp').has('clojure')).toBe(true)
  })

  test('a focused star is brightest; its ancestors are warm, descendants cool', () => {
    const lit = illuminate(Focus.Star({ starId: 'haskell' }))
    const focused = lit.stars.get('haskell')
    const ancestor = lit.stars.get('ml')
    const descendant = lit.stars.get('elm')
    expect(focused?.level).toBeGreaterThan(1.5)
    expect(ancestor?.tint).toBe(-1)
    expect(descendant?.tint).toBe(1)
    expect(lit.dimming).toBe(1)
  })

  test('following an idea lights exactly the links that carry it', () => {
    const lit = illuminate(Focus.Idea({ ideaId: 'monads' }))
    expect(new Set(lit.links.keys())).toEqual(
      new Set(Array.map(linksCarrying('monads'), linkId)),
    )
    expect(lit.maybeIdeaId).toEqual(Option.some('monads'))
  })

  test('a focused star is the only focused star', () => {
    expect(illuminate(Focus.Star({ starId: 'lisp' })).focusedStarIds).toEqual(
      new Set(['lisp']),
    )
  })

  test('the overview lights everything evenly', () => {
    const lit = illuminate(Focus.Overview())
    expect(lit.dimming).toBe(0)
    expect(lit.stars.size).toBe(0)
  })
})
