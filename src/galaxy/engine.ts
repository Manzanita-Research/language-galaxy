import { Array, Equal, Option } from 'effect'
import tgpu, { type TgpuRoot } from 'typegpu'

import { stars } from '../domain/catalogue'
import type { Constellation } from '../domain/constellation'
import { PRESENT } from '../domain/epoch'
import { Focus } from '../domain/focus'
import { type Illumination, illuminate } from '../domain/illumination'
import { type Box, clampZoom, createCameraRig, fitBox } from './camera'
import { createGlowState, settleGlow } from './glow'
import { createLabelLayer } from './labels'
import { pickStar } from './picking'
import { attachGestures } from './pointer'
import { createRenderer } from './renderer'
import { Framing, type FreeArea, GalaxyEvent, type GalaxyScene } from './scene'
import { isBorn } from './shaders'
import { buildSkyData } from './skyData'

/** The sky's imperative boundary. Foldkit decides what the reader attends
 *  to; the engine turns a GalaxyScene into light, moves the camera, and
 *  reports clicks and GPU loss back as GalaxyEvents. */
export type GalaxyEngine = Readonly<{
  show: (scene: GalaxyScene) => void
  frame: (framing: Framing, free: FreeArea) => void
  subscribe: (listener: (event: GalaxyEvent) => void) => () => void
  setInteractive: (isInteractive: boolean) => void
  dispose: () => void
}>

const MAX_PIXEL_RATIO = 2
const MS_PER_SECOND = 1000
const GLOW_EASE_RATE = 7
const EPOCH_EASE_RATE = 9
const LONGEST_FRAME_SECONDS = 0.1
/** With reduced motion, the sky's own animation runs this much slower. */
const REDUCED_MOTION_TIME_SCALE = 0.15
const WHOLE_SKY: Box = { minX: -1.08, minY: -1.08, maxX: 1.08, maxY: 1.08 }
const WHOLE_SKY_MAX_ZOOM = 1.4
const DOUBLE_CLICK_ZOOM = 1.9
/** A star counts as lit once its eased glow passes this level. */
const LIT_LEVEL = 0.55
/** The sky counts as dimmed around a focus past this point of its fade. */
const DIMMED = 0.5

const pixelRatio = (): number =>
  Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)

const easing = (elapsed: number, rate: number): number =>
  1 - Math.exp(-elapsed * rate)

/** Create the sky inside `host`. Everything acquired along the way is
 *  released if any later step throws, and released at most once, even if
 *  one release fails. */
export const createGalaxyEngine = async (
  host: HTMLElement,
): Promise<GalaxyEngine> => {
  if (!navigator.gpu) {
    throw new Error('This browser does not support WebGPU yet.')
  }
  const root = await tgpu.init()
  const cleanups: Array<() => void> = [() => root.destroy()]
  let isCleanedUp = false
  const cleanUp = () => {
    if (!isCleanedUp) {
      isCleanedUp = true
      Array.forEach(Array.reverse(cleanups), cleanup => {
        try {
          cleanup()
        } catch {
          // Keep releasing the rest; a failed release must not leak the GPU.
        }
      })
    }
  }
  try {
    return buildEngine(host, root, cleanups, cleanUp)
  } catch (error) {
    cleanUp()
    throw error
  }
}

const buildEngine = (
  host: HTMLElement,
  root: TgpuRoot,
  cleanups: Array<() => void>,
  cleanUp: () => void,
): GalaxyEngine => {
  const canvas = document.createElement('canvas')
  canvas.className = 'galaxy-canvas'
  host.appendChild(canvas)
  cleanups.push(() => canvas.remove())

  const data = buildSkyData()
  const renderer = createRenderer(
    root,
    root.configureContext({ canvas, alphaMode: 'opaque' }),
    navigator.gpu.getPreferredCanvasFormat(),
    data,
  )
  cleanups.push(renderer.dispose)

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const camera = createCameraRig(host, () => reducedMotion.matches)
  const glow = createGlowState(data)
  const listeners = new Set<(event: GalaxyEvent) => void>()
  const emit = (event: GalaxyEvent) =>
    listeners.forEach(listener => listener(event))

  let epochShown: number = PRESENT
  let epochWanted: number = PRESENT
  let dimmingShown = 0
  let illumination: Illumination = illuminate(Focus.Overview())
  let maybeFocusKey: Option.Option<string> = Option.none()
  let hidden: ReadonlySet<Constellation> = new Set()
  let maybeHoveredIndex: Option.Option<number> = Option.none()
  let isInteractive = true
  let isScenery = false
  let lastTime = 0
  let frameRequest = 0

  const aimGlow = () => glow.aim({ illumination, hidden, maybeHoveredIndex })

  // CAMERA

  /** The free area arrives in viewport coordinates; the camera fits within
   *  the host. */
  const fitInto = (box: Box, free: FreeArea, maxZoom: number) => {
    const rect = host.getBoundingClientRect()
    return fitBox(
      box,
      rect.width,
      rect.height,
      {
        left: Math.max(free.left - rect.left, 0),
        top: Math.max(free.top - rect.top, 0),
        right: Math.min(free.right - rect.left, rect.width),
        bottom: Math.min(free.bottom - rect.top, rect.height),
      },
      maxZoom,
    )
  }

  const boxAround = (starIds: ReadonlyArray<string>): Option.Option<Box> =>
    Array.match(
      Array.map(starIds, id => data.placementOf(id)),
      {
        onEmpty: () => Option.none(),
        onNonEmpty: points =>
          Option.some({
            minX: Math.min(...Array.map(points, point => point.x)),
            minY: Math.min(...Array.map(points, point => point.y)),
            maxX: Math.max(...Array.map(points, point => point.x)),
            maxY: Math.max(...Array.map(points, point => point.y)),
          }),
      },
    )

  // POINTER

  const starAt = (x: number, y: number): Option.Option<number> =>
    pickStar(
      {
        stars,
        screenOf: star => {
          const placement = data.placementOf(star.id)
          return camera.toScreen(placement.x, placement.y)
        },
        zoom: camera.current().zoom,
        epoch: epochShown,
        isHidden: star => hidden.has(star.constellation),
      },
      x,
      y,
    )

  const setHovered = (maybeIndex: Option.Option<number>) => {
    if (!Equal.equals(maybeIndex, maybeHoveredIndex)) {
      maybeHoveredIndex = maybeIndex
      canvas.style.cursor = Option.isSome(maybeIndex) ? 'pointer' : 'grab'
      aimGlow()
    }
  }

  cleanups.push(
    attachGestures(canvas, host, {
      isInteractive: () => isInteractive,
      hover: ({ x, y }) => setHovered(starAt(x, y)),
      leave: () => setHovered(Option.none()),
      click: ({ x, y }) =>
        emit(
          Option.match(
            Option.flatMap(starAt(x, y), index => Array.get(stars, index)),
            {
              onNone: () => GalaxyEvent.ClickedEmptySky(),
              onSome: star => GalaxyEvent.ClickedStar({ starId: star.id }),
            },
          ),
        ),
      pan: camera.pan,
      zoomAround: ({ x, y }, factor) => camera.zoomAround(x, y, factor),
      zoomInAt: ({ x, y }) => {
        const [worldX, worldY] = camera.toWorld(x, y)
        camera.flyTo(
          {
            x: worldX,
            y: worldY,
            zoom: clampZoom(camera.current().zoom * DOUBLE_CLICK_ZOOM),
          },
          lastTime,
        )
      },
      setCursor: cursor => {
        canvas.style.cursor = cursor
      },
    }),
  )

  // SIZE

  const resize = () => {
    const ratio = pixelRatio()
    const width = Math.max(1, Math.round(host.clientWidth * ratio))
    const height = Math.max(1, Math.round(host.clientHeight * ratio))
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
      renderer.resize(width, height)
    }
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(host)
  cleanups.push(() => resizeObserver.disconnect())
  resize()

  const labels = createLabelLayer(host, stars)
  cleanups.push(labels.dispose)

  // FRAME LOOP

  const updateLabels = () =>
    labels.update({
      states: Array.map(stars, (star, index) => {
        const placement = data.placementOf(star.id)
        return {
          x: placement.x,
          y: placement.y,
          isVisible:
            !isScenery && isBorn(star.year, epochShown) && glow.isShown(index),
          isLit: glow.levelOf(index) > LIT_LEVEL,
          isFocused: illumination.focusedStarIds.has(star.id),
          isHovered: Option.contains(maybeHoveredIndex, index),
        }
      }),
      toScreen: camera.toScreen,
      scale: camera.scale(),
      isDimmed: dimmingShown > DIMMED,
      epoch: epochShown,
    })

  const render = (now: number) => {
    frameRequest = requestAnimationFrame(render)
    const elapsed = Math.min(
      (now - lastTime) / MS_PER_SECOND,
      LONGEST_FRAME_SECONDS,
    )
    lastTime = now
    camera.advance(now)
    const glowAmount = easing(elapsed, GLOW_EASE_RATE)
    glow.ease(glowAmount)
    epochShown += (epochWanted - epochShown) * easing(elapsed, EPOCH_EASE_RATE)
    dimmingShown += (illumination.dimming - dimmingShown) * glowAmount

    const view = camera.current()
    const ratio = pixelRatio()
    renderer.draw(
      {
        width: canvas.width,
        height: canvas.height,
        centerX: view.x,
        centerY: view.y,
        scale: camera.scale() * ratio,
        zoom: view.zoom,
        time:
          (now / MS_PER_SECOND) *
          (reducedMotion.matches ? REDUCED_MOTION_TIME_SCALE : 1),
        epoch: epochShown,
        pixelRatio: ratio,
        dimming: dimmingShown,
      },
      glow.buffers,
    )
    updateLabels()
  }

  /** Stop drawing for good, and tell Foldkit why. */
  const darken = (reason: string) => {
    emit(GalaxyEvent.LostDevice({ reason }))
    cleanUp()
  }

  root.device.lost
    .then(info => {
      if (info.reason !== 'destroyed') {
        darken(info.message || 'The GPU device was lost.')
      }
    })
    .catch(() => undefined)
  root.device.addEventListener(
    'uncapturederror',
    event => darken(event.error.message),
    { once: true },
  )

  aimGlow()
  settleGlow(glow)
  camera.jumpTo(
    fitInto(
      WHOLE_SKY,
      { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight },
      WHOLE_SKY_MAX_ZOOM,
    ),
  )
  frameRequest = requestAnimationFrame(render)
  cleanups.push(() => cancelAnimationFrame(frameRequest))

  return {
    show: scene => {
      const key = JSON.stringify(scene.focus)
      if (!Option.contains(maybeFocusKey, key)) {
        illumination = illuminate(scene.focus)
        maybeFocusKey = Option.some(key)
      }
      hidden = new Set(scene.hiddenConstellations)
      isScenery = scene.isScenery
      epochWanted = scene.epoch
      aimGlow()
    },
    frame: (framing, free) =>
      Framing.match(framing, {
        Whole: () =>
          camera.flyTo(fitInto(WHOLE_SKY, free, WHOLE_SKY_MAX_ZOOM), lastTime),
        Stars: ({ starIds, maxZoom }) =>
          Option.match(boxAround(starIds), {
            onNone: () => undefined,
            onSome: box => camera.flyTo(fitInto(box, free, maxZoom), lastTime),
          }),
      }),
    subscribe: listener => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    setInteractive: value => {
      isInteractive = value
    },
    dispose: cleanUp,
  }
}
