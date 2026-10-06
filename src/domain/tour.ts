import { Schema } from 'effect'

export const Snippet = Schema.Struct({
  /** Caption, e.g. "Haskell, 1996". */
  label: Schema.String,
  source: Schema.String,
})
export type Snippet = typeof Snippet.Type

export const TourStep = Schema.Struct({
  star: Schema.String,
  title: Schema.String,
  body: Schema.String,
  /** Zero, one or two snippets. Two read as a then/now comparison. */
  snippets: Schema.Array(Snippet),
})
export type TourStep = typeof TourStep.Type

/** A narrated path through the galaxy. */
export const Tour = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  /** The question the tour answers. */
  question: Schema.String,
  steps: Schema.NonEmptyArray(TourStep),
})
export type Tour = typeof Tour.Type
