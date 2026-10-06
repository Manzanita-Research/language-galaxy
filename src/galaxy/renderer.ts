import { Array } from 'effect'
import type { TgpuRoot } from 'typegpu'
import * as d from 'typegpu/data'

import {
  Frame,
  HDR_FORMAT,
  LINK_VERTICES,
  LinkDatum,
  Nebula,
  QUAD_VERTICES,
  Sector,
  StarDatum,
  compositeFragment,
  compositeLayout,
  downsampleFragment,
  fullscreenVertex,
  linkFragment,
  linkVertex,
  prefilterFragment,
  sceneLayout,
  skyFragment,
  starFragment,
  starVertex,
  textureLayout,
  upsampleFragment,
} from './shaders'
import type { SkyData } from './skyData'

const BLOOM_LEVELS = 5
const ADDITIVE: GPUBlendState = {
  color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
  alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
}
const BLACK = [0, 0, 0, 1] as const

export type FrameValues = Readonly<{
  /** Device pixels. */
  width: number
  height: number
  centerX: number
  centerY: number
  /** Device pixels per world unit. */
  scale: number
  zoom: number
  time: number
  epoch: number
  pixelRatio: number
  dimming: number
}>

/** Per-frame values the sky eases on the CPU and uploads whole. */
export type GlowBuffers = Readonly<{
  stars: Float32Array
  links: Float32Array
  nebulae: Float32Array
}>

export type Renderer = Readonly<{
  resize: (width: number, height: number) => void
  draw: (frame: FrameValues, glow: GlowBuffers) => void
  dispose: () => void
}>

/** The render graph: sky, filaments and stars additively into a half-float
 *  target, a five-level bloom chain, then one tone-mapped composite. */
export const createRenderer = (
  root: TgpuRoot,
  context: GPUCanvasContext,
  canvasFormat: GPUTextureFormat,
  data: SkyData,
): Renderer => {
  const device = root.device
  const starCount = data.starRecords.length
  const linkCount = data.linkRecords.length
  const nebulaCount = Math.max(data.fields.length, 1)

  const frameBuffer = root.createBuffer(Frame).$usage('uniform')
  const starGlowBuffer = root
    .createBuffer(d.arrayOf(d.vec4f, starCount))
    .$usage('storage')
  const linkGlowBuffer = root
    .createBuffer(d.arrayOf(d.vec4f, linkCount * 2))
    .$usage('storage')
  const nebulaBuffer = root
    .createBuffer(d.arrayOf(Nebula, nebulaCount))
    .$usage('storage')

  const sceneBindGroup = root.createBindGroup(sceneLayout, {
    frame: frameBuffer,
    stars: root
      .createBuffer(d.arrayOf(StarDatum, starCount), data.starRecords)
      .$usage('storage'),
    starGlow: starGlowBuffer,
    links: root
      .createBuffer(d.arrayOf(LinkDatum, linkCount), data.linkRecords)
      .$usage('storage'),
    linkGlow: linkGlowBuffer,
    nebulae: nebulaBuffer,
    sectors: root
      .createBuffer(
        d.arrayOf(Sector, data.sectorRecords.length),
        data.sectorRecords,
      )
      .$usage('storage'),
  })

  const fullscreen = (
    fragment:
      | typeof skyFragment
      | typeof prefilterFragment
      | typeof compositeFragment,
    format: GPUTextureFormat,
    blend?: GPUBlendState,
  ) =>
    root.createRenderPipeline({
      vertex: fullscreenVertex,
      fragment,
      targets: blend ? { format, blend } : { format },
    })

  const skyPipeline = fullscreen(skyFragment, HDR_FORMAT)
  const linkPipeline = root.createRenderPipeline({
    vertex: linkVertex,
    fragment: linkFragment,
    targets: { format: HDR_FORMAT, blend: ADDITIVE },
    primitive: { topology: 'triangle-strip' },
  })
  const starPipeline = root.createRenderPipeline({
    vertex: starVertex,
    fragment: starFragment,
    targets: { format: HDR_FORMAT, blend: ADDITIVE },
  })
  const prefilterPipeline = fullscreen(prefilterFragment, HDR_FORMAT)
  const downsamplePipeline = fullscreen(downsampleFragment, HDR_FORMAT)
  const upsamplePipeline = fullscreen(upsampleFragment, HDR_FORMAT, ADDITIVE)
  const compositePipeline = fullscreen(compositeFragment, canvasFormat)

  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
  })

  const createTarget = (width: number, height: number): GPUTexture =>
    device.createTexture({
      size: [Math.max(1, width), Math.max(1, height)],
      format: HDR_FORMAT,
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    })

  const sampling = (view: GPUTextureView) =>
    root.createBindGroup(textureLayout, { source: view, linear: sampler })

  const createTargets = (width: number, height: number) => {
    const sceneTexture = createTarget(width, height)
    const bloomTextures = Array.makeBy(BLOOM_LEVELS, level =>
      createTarget(
        Math.ceil(width / 2 ** (level + 1)),
        Math.ceil(height / 2 ** (level + 1)),
      ),
    )
    const scene = sceneTexture.createView()
    const bloom = Array.map(bloomTextures, texture => texture.createView())
    const bloomSampling = Array.map(bloom, sampling)
    return {
      textures: [sceneTexture, ...bloomTextures],
      scene,
      bloom,
      sceneSampling: sampling(scene),
      bloomSampling,
      composite: root.createBindGroup(compositeLayout, {
        frame: frameBuffer,
        scene,
        bloom: bloom[0] ?? scene,
        linear: sampler,
      }),
    }
  }

  let targets = createTargets(1, 1)

  const drawBloom = () => {
    const firstLevel = targets.bloom[0]
    if (firstLevel) {
      prefilterPipeline
        .with(targets.sceneSampling)
        .withColorAttachment({
          view: firstLevel,
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: BLACK,
        })
        .draw(3)
    }
    Array.forEach(Array.range(1, BLOOM_LEVELS - 1), level => {
      const source = targets.bloomSampling[level - 1]
      const view = targets.bloom[level]
      if (source && view) {
        downsamplePipeline
          .with(source)
          .withColorAttachment({
            view,
            loadOp: 'clear',
            storeOp: 'store',
            clearValue: BLACK,
          })
          .draw(3)
      }
    })
    Array.forEach(Array.reverse(Array.range(1, BLOOM_LEVELS - 1)), level => {
      const source = targets.bloomSampling[level]
      const view = targets.bloom[level - 1]
      if (source && view) {
        upsamplePipeline
          .with(source)
          .withColorAttachment({ view, loadOp: 'load', storeOp: 'store' })
          .draw(3)
      }
    })
  }

  return {
    resize: (width, height) => {
      Array.forEach(targets.textures, texture => texture.destroy())
      targets = createTargets(width, height)
    },
    draw: (frame, glow) => {
      device.queue.writeBuffer(root.unwrap(starGlowBuffer), 0, glow.stars)
      device.queue.writeBuffer(root.unwrap(linkGlowBuffer), 0, glow.links)
      device.queue.writeBuffer(root.unwrap(nebulaBuffer), 0, glow.nebulae)
      frameBuffer.write({
        resolution: d.vec2f(frame.width, frame.height),
        center: d.vec2f(frame.centerX, frame.centerY),
        scale: frame.scale,
        zoom: frame.zoom,
        time: frame.time,
        epoch: frame.epoch,
        pixelRatio: frame.pixelRatio,
        dimming: frame.dimming,
      })
      skyPipeline
        .with(sceneBindGroup)
        .withColorAttachment({
          view: targets.scene,
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: BLACK,
        })
        .draw(3)
      linkPipeline
        .with(sceneBindGroup)
        .withColorAttachment({
          view: targets.scene,
          loadOp: 'load',
          storeOp: 'store',
        })
        .draw(LINK_VERTICES, linkCount)
      starPipeline
        .with(sceneBindGroup)
        .withColorAttachment({
          view: targets.scene,
          loadOp: 'load',
          storeOp: 'store',
        })
        .draw(QUAD_VERTICES, starCount)
      drawBloom()
      compositePipeline
        .with(targets.composite)
        .withColorAttachment({
          view: context,
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: BLACK,
        })
        .draw(3)
    },
    dispose: () => {
      Array.forEach(targets.textures, texture => texture.destroy())
    },
  }
}
