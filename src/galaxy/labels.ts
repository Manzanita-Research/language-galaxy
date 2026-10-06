import { Array, Order } from 'effect'

import {
  type Constellation,
  constellationOrder,
  constellations,
} from '../domain/constellation'
import type { Star } from '../domain/star'
import { polarToWorld, radiusOfYear, toRadians } from './layout'

export type LabelState = Readonly<{
  x: number
  y: number
  isVisible: boolean
  isLit: boolean
  isFocused: boolean
  isHovered: boolean
}>

export type LabelFrame = Readonly<{
  states: ReadonlyArray<LabelState>
  toScreen: (x: number, y: number) => readonly [number, number]
  /** CSS pixels per world unit. */
  scale: number
  /** Whether the sky is dimmed around a focus. */
  isDimmed: boolean
  epoch: number
}>

export type LabelLayer = Readonly<{
  update: (frame: LabelFrame) => void
  dispose: () => void
}>

type Emphasis = 'Focus' | 'Lit' | 'Rest'

type LabelNode = {
  readonly star: Star
  readonly element: HTMLDivElement
  width: number
  shownX: number
  shownY: number
  isShown: boolean
  emphasis: Emphasis
}

type Box = Readonly<{
  left: number
  top: number
  right: number
  bottom: number
}>

type Candidate = Readonly<{
  node: LabelNode
  x: number
  y: number
  priority: number
  emphasis: Emphasis
}>

type Placement = Readonly<{
  node: LabelNode
  left: number
  top: number
  emphasis: Emphasis
}>

const LABEL_HEIGHT = 18
const LABEL_GAP = 4
const FOCUSED_WIDTH_SCALE = 1.35
const OFFSCREEN_MARGIN_X = 40
const OFFSCREEN_MARGIN_Y = 20
const PRIORITY_HOVER = 4000
const PRIORITY_FOCUS = 2000
const PRIORITY_LIT = 600
const PRIORITY_PER_MAGNITUDE = 40
const PRIORITY_FIELD = 10
/** Lit labels appear earlier than resting ones as the reader zooms in. */
const LIT_SCALE_DISCOUNT = 0.6
const CONSTELLATION_RADIUS = 1.13
const CONSTELLATION_FADE_START = 2.2
const CONSTELLATION_FADE_RATE = 700
const CONSTELLATION_DIMMED = 0.55
const RING_YEARS: ReadonlyArray<number> = [1940, 1960, 1980, 2000, 2020]
/** The ring years sit along the gap between Lazy & Pure and Effect Systems. */
const RING_LABEL_ANGLE = toRadians(198.5)

/** CSS pixels per world unit a star needs before its label is worth
 *  showing. Landmarks are always labelled. */
const SCALE_NEEDED_BY_MAGNITUDE: ReadonlyArray<number> = [0, 560, 980]
const SCALE_NEEDED_FOR_FIELDS = 300
/** Labels sit a little further from brighter stars. */
const LABEL_OFFSET = 11
/** Magnitudes run 1 (brightest) to 3; this turns that into a rank. */
const DIMMEST_MAGNITUDE_RANK = 4

const scaleNeededFor = (star: Star): number =>
  star.kind === 'Field'
    ? SCALE_NEEDED_FOR_FIELDS
    : (SCALE_NEEDED_BY_MAGNITUDE[star.magnitude - 1] ?? SCALE_NEEDED_FOR_FIELDS)

const overlaps = (first: Box, second: Box): boolean =>
  first.left < second.right &&
  first.right > second.left &&
  first.top < second.bottom &&
  first.bottom > second.top

const byPriority = Order.flip(
  Order.mapInput(Order.Number, (candidate: Candidate) => candidate.priority),
)

const candidateFor = (
  node: LabelNode,
  state: LabelState,
  frame: LabelFrame,
  width: number,
  height: number,
): ReadonlyArray<Candidate> => {
  const needed = scaleNeededFor(node.star)
  const isWanted =
    state.isHovered ||
    state.isFocused ||
    (frame.isDimmed
      ? state.isLit && frame.scale >= needed * LIT_SCALE_DISCOUNT
      : frame.scale >= needed)
  if (!state.isVisible || !isWanted) {
    return []
  }
  const [x, y] = frame.toScreen(state.x, state.y)
  if (
    x < -OFFSCREEN_MARGIN_X ||
    y < -OFFSCREEN_MARGIN_Y ||
    x > width + OFFSCREEN_MARGIN_X ||
    y > height + OFFSCREEN_MARGIN_Y
  ) {
    return []
  }
  const isLit = state.isLit && frame.isDimmed
  return [
    {
      node,
      x,
      y,
      emphasis: state.isFocused ? 'Focus' : isLit ? 'Lit' : 'Rest',
      priority:
        (state.isHovered ? PRIORITY_HOVER : 0) +
        (state.isFocused ? PRIORITY_FOCUS : 0) +
        (isLit ? PRIORITY_LIT : 0) +
        (DIMMEST_MAGNITUDE_RANK - node.star.magnitude) *
          PRIORITY_PER_MAGNITUDE +
        (node.star.kind === 'Field' ? PRIORITY_FIELD : 0),
    },
  ]
}

/** Greedy placement by priority: each label tries the right of its star,
 *  then the left, and gives way if both collide with something more
 *  important. The focused star is always labelled. */
const placeLabels = (
  candidates: ReadonlyArray<Candidate>,
): ReadonlyArray<Placement> => {
  const taken: Array<Box> = []
  const placements: Array<Placement> = []
  Array.forEach(candidates, candidate => {
    const offset = LABEL_OFFSET - candidate.node.star.magnitude
    const width =
      candidate.node.width *
      (candidate.emphasis === 'Focus' ? FOCUSED_WIDTH_SCALE : 1)
    const boxAt = (left: number): Box => ({
      left: left - LABEL_GAP,
      top: candidate.y - LABEL_HEIGHT / 2 - LABEL_GAP,
      right: left + width + LABEL_GAP,
      bottom: candidate.y + LABEL_HEIGHT / 2 + LABEL_GAP,
    })
    const isFree = (left: number) =>
      !Array.some(taken, other => overlaps(boxAt(left), other))
    const right = candidate.x + offset
    const left = candidate.x - offset - width
    const chosen =
      candidate.emphasis === 'Focus' || isFree(right)
        ? right
        : isFree(left)
          ? left
          : undefined
    if (chosen !== undefined) {
      taken.push(boxAt(chosen))
      placements.push({
        node: candidate.node,
        left: chosen,
        top: candidate.y - LABEL_HEIGHT / 2,
        emphasis: candidate.emphasis,
      })
    }
  })
  return placements
}

const applyPlacement = ({ node, left, top, emphasis }: Placement): void => {
  const x = Math.round(left)
  const y = Math.round(top)
  if (x !== node.shownX || y !== node.shownY) {
    node.element.style.transform = `translate3d(${x}px, ${y}px, 0)`
    node.shownX = x
    node.shownY = y
  }
  if (emphasis !== node.emphasis) {
    node.element.dataset['emphasis'] = emphasis
    node.emphasis = emphasis
  }
}

const createStarLabel = (layer: HTMLElement, star: Star): LabelNode => {
  const element = document.createElement('div')
  element.className = 'galaxy-label'
  element.dataset['kind'] = star.kind
  element.dataset['magnitude'] = `${star.magnitude}`
  const name = document.createElement('span')
  name.className = 'galaxy-label-name'
  name.textContent = star.name
  const year = document.createElement('span')
  year.className = 'galaxy-label-year'
  year.textContent = `${star.year}`
  element.append(name, year)
  layer.appendChild(element)
  return {
    star,
    element,
    width: 0,
    shownX: -1,
    shownY: -1,
    isShown: false,
    emphasis: 'Rest',
  }
}

const createTextLabel = (
  layer: HTMLElement,
  className: string,
  text: string,
): HTMLDivElement => {
  const element = document.createElement('div')
  element.className = className
  element.textContent = text
  layer.appendChild(element)
  return element
}

/** Crisp HTML text riding above the GPU sky: star names, tradition names
 *  around the rim, and decade years along one spoke. */
export const createLabelLayer = (
  host: HTMLElement,
  stars: ReadonlyArray<Star>,
): LabelLayer => {
  const layer = document.createElement('div')
  layer.className = 'galaxy-labels'
  layer.setAttribute('aria-hidden', 'true')
  host.appendChild(layer)

  const nodes = Array.map(stars, star => createStarLabel(layer, star))
  const constellationLabels = Array.map(
    constellationOrder,
    (constellation: Constellation) => {
      const info = constellations[constellation]
      const element = createTextLabel(layer, 'galaxy-constellation', info.name)
      element.style.setProperty('--tone', info.color)
      return { angle: info.angle, element }
    },
  )
  const ringLabels = Array.map(RING_YEARS, year => ({
    year,
    element: createTextLabel(layer, 'galaxy-ring-year', `${year}`),
  }))

  const measure = () =>
    Array.forEach(nodes, node => {
      node.width = node.element.offsetWidth
    })
  measure()
  document.fonts.ready.then(measure).catch(() => undefined)

  const updateStarLabels = (frame: LabelFrame) => {
    const width = host.clientWidth
    const height = host.clientHeight
    const candidates = Array.sort(
      Array.flatMap(nodes, (node, index) => {
        const state = frame.states[index]
        return state === undefined
          ? []
          : candidateFor(node, state, frame, width, height)
      }),
      byPriority,
    )
    const placements = placeLabels(candidates)
    Array.forEach(placements, applyPlacement)
    const shown = new Set(Array.map(placements, placement => placement.node))
    Array.forEach(nodes, node => {
      const isShown = shown.has(node)
      if (isShown !== node.isShown) {
        node.element.classList.toggle('is-shown', isShown)
        node.isShown = isShown
      }
    })
  }

  const updateRimLabels = (frame: LabelFrame) => {
    const opacity =
      Math.max(
        0,
        Math.min(
          1,
          CONSTELLATION_FADE_START - frame.scale / CONSTELLATION_FADE_RATE,
        ),
      ) * (frame.isDimmed ? CONSTELLATION_DIMMED : 1)
    Array.forEach(constellationLabels, ({ angle, element }) => {
      const [worldX, worldY] = polarToWorld(
        CONSTELLATION_RADIUS,
        toRadians(angle),
      )
      const [x, y] = frame.toScreen(worldX, worldY)
      const rotation = angle + (Math.cos(toRadians(angle)) < 0 ? 180 : 0)
      element.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) translate(-50%, -50%) rotate(${rotation}deg)`
      element.style.opacity = `${opacity}`
    })
    Array.forEach(ringLabels, ({ year, element }) => {
      const [worldX, worldY] = polarToWorld(
        radiusOfYear(year),
        RING_LABEL_ANGLE,
      )
      const [x, y] = frame.toScreen(worldX, worldY)
      element.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) translate(-50%, -50%)`
      element.style.opacity = year <= frame.epoch ? '1' : '0'
    })
  }

  return {
    update: frame => {
      updateStarLabels(frame)
      updateRimLabels(frame)
    },
    dispose: () => layer.remove(),
  }
}
