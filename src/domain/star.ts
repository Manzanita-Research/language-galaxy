import { Schema } from 'effect'

import { Constellation } from './constellation'

/** What sort of light a star gives off.
 *
 *  - `Field`: a discipline outside programming (logic, AI, telecom) that fed
 *    ideas in. Drawn as a nebula rather than a point.
 *  - `Theory`: a paper, calculus or model. Ideas before implementations.
 *  - `Language`: a programming language.
 *  - `Tool`: a library, framework or system people use today. */
export const StarKind = Schema.Literals(['Field', 'Theory', 'Language', 'Tool'])
export type StarKind = typeof StarKind.Type

/** 1 is a landmark that is always labelled; 3 appears when you lean in. */
const Magnitude = Schema.Literals([1, 2, 3])

export const Star = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  kind: StarKind,
  constellation: Constellation,
  /** Year of birth: first paper, first implementation or first release. */
  year: Schema.Number,
  people: Schema.String,
  /** Eight words or fewer. Shown under the name. */
  epithet: Schema.String,
  /** Two or three sentences of plain, specific prose. */
  blurb: Schema.String,
  /** Ideas this star originated or crystallised. */
  ideas: Schema.Array(Schema.String),
  magnitude: Magnitude,
})
export type Star = typeof Star.Type
