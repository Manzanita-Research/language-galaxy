import { Number, Option } from 'effect'

import type { FreeArea } from './scene'

/** A centre in world space and a zoom relative to the whole-galaxy view. */
export type Camera = Readonly<{ x: number; y: number; zoom: number }>

type Flight = Readonly<{
  from: Camera
  to: Camera
  startedAt: number
  duration: number
}>

export type Box = Readonly<{
  minX: number
  minY: number
  maxX: number
  maxY: number
}>

const MIN_ZOOM = 0.55
const MAX_ZOOM = 16
/** Fraction of the shorter viewport side the galaxy's radius fills at zoom 1. */
const FILL = 0.44
/** How far a long journey lifts away in log-zoom at its midpoint. */
const MAX_LIFT = 0.9
const LIFT_PER_UNIT = 0.9
const FLIGHT_BASE_MS = 700
const FLIGHT_MS_PER_UNIT = 900
const FLIGHT_MS_PER_ZOOM = 260
const FLIGHT_MAX_MS = 2200
/** Never fit into a sliver: assume at least this much free screen. */
const MIN_FREE_PIXELS = 120
/** A single star still gets a box this big around it. */
const MIN_BOX = 0.06
/** Margin left around a fitted box, as a fraction of the free area. */
const FIT_MARGIN = 0.78

export const clampZoom = (zoom: number): number =>
  Number.clamp(zoom, { minimum: MIN_ZOOM, maximum: MAX_ZOOM })

const pixelsPerUnit = (camera: Camera, width: number, height: number) =>
  camera.zoom * Math.min(width, height) * FILL

const easeInOut = (progress: number): number =>
  progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2

/** Travel eases centre and log-zoom together, and long journeys pull back,
 *  glide and lean in, like a hand moving across a star chart. */
const flightAt = (flight: Flight, now: number): Camera => {
  const eased = easeInOut(
    Number.clamp((now - flight.startedAt) / flight.duration, {
      minimum: 0,
      maximum: 1,
    }),
  )
  const distance = Math.hypot(
    flight.to.x - flight.from.x,
    flight.to.y - flight.from.y,
  )
  const lift =
    Math.sin(Math.PI * eased) * Math.min(distance * LIFT_PER_UNIT, MAX_LIFT)
  return {
    x: flight.from.x + (flight.to.x - flight.from.x) * eased,
    y: flight.from.y + (flight.to.y - flight.from.y) * eased,
    zoom: Math.exp(
      Math.log(flight.from.zoom) * (1 - eased) +
        Math.log(flight.to.zoom) * eased -
        lift,
    ),
  }
}

const flightDuration = (from: Camera, to: Camera): number =>
  Number.clamp(
    FLIGHT_BASE_MS +
      Math.hypot(to.x - from.x, to.y - from.y) * FLIGHT_MS_PER_UNIT +
      Math.abs(Math.log(to.zoom / from.zoom)) * FLIGHT_MS_PER_ZOOM,
    { minimum: FLIGHT_BASE_MS, maximum: FLIGHT_MAX_MS },
  )

/** A camera that fits a world-space box into the free part of the screen. */
export const fitBox = (
  box: Box,
  width: number,
  height: number,
  free: FreeArea,
  maxZoom: number,
): Camera => {
  const freeWidth = Math.max(free.right - free.left, MIN_FREE_PIXELS)
  const freeHeight = Math.max(free.bottom - free.top, MIN_FREE_PIXELS)
  const unit = Math.min(width, height) * FILL
  const zoom = clampZoom(
    Math.min(
      (freeWidth * FIT_MARGIN) /
        (Math.max(box.maxX - box.minX, MIN_BOX) * unit),
      (freeHeight * FIT_MARGIN) /
        (Math.max(box.maxY - box.minY, MIN_BOX) * unit),
      maxZoom,
    ),
  )
  const scale = zoom * unit
  return {
    x:
      (box.minX + box.maxX) / 2 -
      ((free.left + free.right) / 2 - width / 2) / scale,
    y:
      (box.minY + box.maxY) / 2 -
      ((free.top + free.bottom) / 2 - height / 2) / scale,
    zoom,
  }
}

export type CameraRig = Readonly<{
  current: () => Camera
  /** CSS pixels per world unit. */
  scale: () => number
  toScreen: (x: number, y: number) => readonly [number, number]
  toWorld: (x: number, y: number) => readonly [number, number]
  jumpTo: (camera: Camera) => void
  flyTo: (camera: Camera, now: number) => void
  pan: (dx: number, dy: number) => void
  zoomAround: (x: number, y: number, factor: number) => void
  /** Advance any flight to `now`. */
  advance: (now: number) => void
}>

/** The sky's camera over a host element. Gestures cancel flights; reduced
 *  motion turns flights into jumps. */
export const createCameraRig = (
  host: HTMLElement,
  prefersReducedMotion: () => boolean,
): CameraRig => {
  let camera: Camera = { x: 0, y: 0, zoom: 1 }
  let maybeFlight: Option.Option<Flight> = Option.none()

  const scale = () => pixelsPerUnit(camera, host.clientWidth, host.clientHeight)

  const toScreen = (x: number, y: number): readonly [number, number] => [
    (x - camera.x) * scale() + host.clientWidth / 2,
    (y - camera.y) * scale() + host.clientHeight / 2,
  ]

  const toWorld = (x: number, y: number): readonly [number, number] => [
    (x - host.clientWidth / 2) / scale() + camera.x,
    (y - host.clientHeight / 2) / scale() + camera.y,
  ]

  const jumpTo = (destination: Camera) => {
    camera = destination
    maybeFlight = Option.none()
  }

  return {
    current: () => camera,
    scale,
    toScreen,
    toWorld,
    jumpTo,
    flyTo: (destination, now) => {
      if (prefersReducedMotion()) {
        jumpTo(destination)
      } else {
        maybeFlight = Option.some({
          from: camera,
          to: destination,
          startedAt: now,
          duration: flightDuration(camera, destination),
        })
      }
    },
    pan: (dx, dy) => {
      maybeFlight = Option.none()
      camera = {
        ...camera,
        x: camera.x - dx / scale(),
        y: camera.y - dy / scale(),
      }
    },
    zoomAround: (x, y, factor) => {
      maybeFlight = Option.none()
      const [beforeX, beforeY] = toWorld(x, y)
      camera = { ...camera, zoom: clampZoom(camera.zoom * factor) }
      const [afterX, afterY] = toWorld(x, y)
      camera = {
        ...camera,
        x: camera.x + beforeX - afterX,
        y: camera.y + beforeY - afterY,
      }
    },
    advance: now => {
      if (Option.isSome(maybeFlight)) {
        const flight = maybeFlight.value
        camera = flightAt(flight, now)
        if (now - flight.startedAt >= flight.duration) {
          maybeFlight = Option.none()
        }
      }
    },
  }
}
