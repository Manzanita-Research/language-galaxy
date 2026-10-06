import { Array, Option } from 'effect'

const CLICK_TOLERANCE = 5
const WHEEL_ZOOM_RATE = 0.0018
const PINCH_WHEEL_ZOOM_RATE = 0.01
const LINE_HEIGHT = 16

type Point = Readonly<{ x: number; y: number }>

/** What a gesture means for the sky, in host-relative CSS pixels. */
export type GestureHandlers = Readonly<{
  isInteractive: () => boolean
  hover: (point: Point) => void
  leave: () => void
  click: (point: Point) => void
  pan: (dx: number, dy: number) => void
  zoomAround: (point: Point, factor: number) => void
  zoomInAt: (point: Point) => void
  setCursor: (cursor: 'grab' | 'grabbing' | 'pointer') => void
}>

/** Drag to pan, wheel or pinch to zoom, double-click to lean in, click to
 *  pick. Returns a function that detaches every listener. */
export const attachGestures = (
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  handlers: GestureHandlers,
): (() => void) => {
  const pointers = new Map<number, Point>()
  let maybeDragStart: Option.Option<Point> = Option.none()
  let isDragging = false
  let pinchDistance = 0

  const localPoint = (event: MouseEvent): Point => {
    const rect = host.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const pinchPair = () => {
    const [first, second] = Array.fromIterable(pointers.values())
    return first && second
      ? Option.some([first, second] as const)
      : Option.none()
  }

  const onPointerDown = (event: PointerEvent) => {
    if (!handlers.isInteractive() || event.button > 0) {
      return
    }
    canvas.setPointerCapture(event.pointerId)
    const point = localPoint(event)
    pointers.set(event.pointerId, point)
    if (pointers.size === 1) {
      maybeDragStart = Option.some(point)
      isDragging = false
    }
    const maybePair = pinchPair()
    if (Option.isSome(maybePair)) {
      const [first, second] = maybePair.value
      pinchDistance = Math.hypot(first.x - second.x, first.y - second.y)
      isDragging = true
    }
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!handlers.isInteractive()) {
      return
    }
    const point = localPoint(event)
    const previous = pointers.get(event.pointerId)
    if (previous === undefined) {
      handlers.hover(point)
      return
    }
    pointers.set(event.pointerId, point)
    const maybePair = pinchPair()
    if (pointers.size === 2 && Option.isSome(maybePair)) {
      const [first, second] = maybePair.value
      const distance = Math.hypot(first.x - second.x, first.y - second.y)
      if (pinchDistance > 0) {
        handlers.zoomAround(
          { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
          distance / pinchDistance,
        )
      }
      pinchDistance = distance
      return
    }
    if (Option.isSome(maybeDragStart)) {
      const start = maybeDragStart.value
      if (
        !isDragging &&
        Math.hypot(point.x - start.x, point.y - start.y) > CLICK_TOLERANCE
      ) {
        isDragging = true
        handlers.setCursor('grabbing')
      }
      if (isDragging) {
        handlers.pan(point.x - previous.x, point.y - previous.y)
      }
    }
  }

  const onPointerUp = (event: PointerEvent) => {
    const wasTracked = pointers.delete(event.pointerId)
    if (pointers.size < 2) {
      pinchDistance = 0
    }
    if (!wasTracked || pointers.size > 0) {
      return
    }
    handlers.setCursor('grab')
    if (!isDragging && handlers.isInteractive()) {
      handlers.click(localPoint(event))
    }
    maybeDragStart = Option.none()
  }

  /** The browser took the pointer back (a scroll, a system gesture): forget
   *  it without treating it as a click. */
  const onPointerCancel = (event: PointerEvent) => {
    pointers.delete(event.pointerId)
    pinchDistance = 0
    if (pointers.size === 0) {
      maybeDragStart = Option.none()
      isDragging = false
      handlers.setCursor('grab')
    }
  }

  const onWheel = (event: WheelEvent) => {
    if (!handlers.isInteractive()) {
      return
    }
    event.preventDefault()
    const delta =
      event.deltaMode === 1 ? event.deltaY * LINE_HEIGHT : event.deltaY
    const rate = event.ctrlKey ? PINCH_WHEEL_ZOOM_RATE : WHEEL_ZOOM_RATE
    handlers.zoomAround(localPoint(event), Math.exp(-delta * rate))
  }

  const onDoubleClick = (event: MouseEvent) => {
    if (handlers.isInteractive()) {
      handlers.zoomInAt(localPoint(event))
    }
  }

  const onPointerLeave = () => {
    if (pointers.size === 0) {
      handlers.leave()
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerCancel)
  canvas.addEventListener('pointerleave', onPointerLeave)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('dblclick', onDoubleClick)
  handlers.setCursor('grab')

  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', onPointerUp)
    canvas.removeEventListener('pointercancel', onPointerCancel)
    canvas.removeEventListener('pointerleave', onPointerLeave)
    canvas.removeEventListener('wheel', onWheel)
    canvas.removeEventListener('dblclick', onDoubleClick)
  }
}
