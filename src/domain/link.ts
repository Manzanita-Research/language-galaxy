import { Schema } from 'effect'

/** How confident the lineage is.
 *
 *  - `Direct`: documented influence. Someone said so, cited it, or carried
 *    the idea across personally.
 *  - `Echo`: a parallel rediscovery or close kinship without a documented
 *    hand-off. History rhymes; these show where. */
const LinkKind = Schema.Literals(['Direct', 'Echo'])

export const Link = Schema.Struct({
  /** The ancestor. Light travels outward from here. */
  from: Schema.String,
  /** The descendant. */
  to: Schema.String,
  ideas: Schema.Array(Schema.String),
  /** One sentence: what crossed over, specifically. */
  note: Schema.String,
  kind: LinkKind,
})
export type Link = typeof Link.Type

export const linkId = (link: Link): string => `${link.from}->${link.to}`
