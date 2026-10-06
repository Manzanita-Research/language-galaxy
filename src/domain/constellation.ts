import { Schema } from 'effect'

/** A school of thought: one wedge of the galaxy. Distance from the core is
 *  time; the angle says which tradition a star belongs to. */
export const Constellation = Schema.Literals([
  'Foundations',
  'Lisp',
  'Objects',
  'Imperative',
  'Ml',
  'Proof',
  'Lazy',
  'Effects',
  'Reactive',
  'Array',
  'Actors',
  'Logic',
])
export type Constellation = typeof Constellation.Type

export type ConstellationInfo = Readonly<{
  name: string
  /** One line naming what binds the tradition together. */
  motto: string
  /** Encoded sRGB hex, mixed into light on the GPU in linear space. */
  color: string
  /** Wedge centre in degrees, clockwise from the top of the galaxy. */
  angle: number
  /** Wedge half-width in degrees. */
  spread: number
  /** Functional traditions are the subject; the others are context. */
  isFunctional: boolean
}>

export const constellations: Readonly<
  Record<Constellation, ConstellationInfo>
> = {
  Foundations: {
    name: 'Foundations',
    motto: 'Logic before machines',
    color: '#f4ecff',
    angle: 0,
    spread: 180,
    isFunctional: true,
  },
  Lisp: {
    name: 'Lisp & Scheme',
    motto: 'Code is data, and data is a list',
    color: '#ff78e1',
    angle: 0,
    spread: 17,
    isFunctional: true,
  },
  Objects: {
    name: 'Objects & Messages',
    motto: 'Little computers talking to each other',
    color: '#ff9a6b',
    angle: 34,
    spread: 16,
    isFunctional: false,
  },
  Imperative: {
    name: 'Imperative & Systems',
    motto: 'Tell the machine what to do, step by step',
    color: '#cfc4e4',
    angle: 69,
    spread: 18,
    isFunctional: false,
  },
  Ml: {
    name: 'The ML Family',
    motto: 'Types you never have to write down',
    color: '#78b6ff',
    angle: 108,
    spread: 19,
    isFunctional: true,
  },
  Proof: {
    name: 'Proofs & Dependent Types',
    motto: 'A program is a proof of its type',
    color: '#b3c6ff',
    angle: 144,
    spread: 16,
    isFunctional: true,
  },
  Lazy: {
    name: 'Lazy & Pure',
    motto: 'Nothing happens until it must',
    color: '#c478ff',
    angle: 180,
    spread: 19,
    isFunctional: true,
  },
  Effects: {
    name: 'Effect Systems',
    motto: 'Side effects as values you can hold',
    color: '#f3a0ff',
    angle: 217,
    spread: 17,
    isFunctional: true,
  },
  Reactive: {
    name: 'Reactive & Dataflow',
    motto: 'Values that change over time',
    color: '#86dcff',
    angle: 252,
    spread: 17,
    isFunctional: true,
  },
  Array: {
    name: 'Arrays & Data',
    motto: 'Whole collections at once',
    color: '#ffe35b',
    angle: 286,
    spread: 16,
    isFunctional: true,
  },
  Actors: {
    name: 'Actors & Concurrency',
    motto: 'Share nothing, pass messages',
    color: '#ff7a59',
    angle: 316,
    spread: 13,
    isFunctional: true,
  },
  Logic: {
    name: 'Logic & Relations',
    motto: 'Say what is true; let the machine search',
    color: '#a8f0d4',
    angle: 341,
    spread: 11,
    isFunctional: false,
  },
}

/** Clockwise order around the galaxy, starting at the top. */
export const constellationOrder: ReadonlyArray<Constellation> = [
  'Lisp',
  'Objects',
  'Imperative',
  'Ml',
  'Proof',
  'Lazy',
  'Effects',
  'Reactive',
  'Array',
  'Actors',
  'Logic',
]
