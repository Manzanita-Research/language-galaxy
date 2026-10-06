import { Schema } from 'effect'

/** A construct that travels: the thing actually inherited along a link. */
export const Idea = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  /** One sentence a working programmer would recognise. */
  gloss: Schema.String,
  /** Where you meet it now, in today's tools. */
  today: Schema.String,
})
export type Idea = typeof Idea.Type
