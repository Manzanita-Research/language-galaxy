import tgpu from 'typegpu'
import { describe, expect, test } from 'vitest'

import {
  compositeFragment,
  downsampleFragment,
  fullscreenVertex,
  linkFragment,
  linkVertex,
  prefilterFragment,
  skyFragment,
  starFragment,
  starVertex,
  upsampleFragment,
} from './shaders'

const entryPoints = {
  fullscreenVertex,
  skyFragment,
  linkVertex,
  linkFragment,
  starVertex,
  starFragment,
  prefilterFragment,
  downsampleFragment,
  upsampleFragment,
  compositeFragment,
}

describe('shaders', () => {
  test.each(Object.entries(entryPoints))(
    '%s resolves to WGSL',
    (_name, entry) => {
      const wgsl = tgpu.resolve([entry])
      expect(wgsl).toMatch(/@(vertex|fragment)/)
      expect(wgsl).not.toMatch(/\.\$\./)
    },
  )

  test('bound resources become group bindings', () => {
    const wgsl = tgpu.resolve([skyFragment])
    expect(wgsl).toMatch(/@group\(0\) @binding\(\d\) var<uniform> frame/)
    expect(wgsl).toMatch(/var<storage, read> sectors: array<Sector>/)
  })
})
