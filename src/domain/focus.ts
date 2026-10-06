import { Option, Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

/** What the reader is attending to. Exactly one at a time: the sky lights
 *  whatever the focus implies and dims the rest. */
export const Focus = defineTaggedUnion({
  Overview: {},
  Star: { starId: Schema.String },
  Idea: { ideaId: Schema.String },
  Tour: { tourId: Schema.String, stepIndex: Schema.Int },
})
export type Focus = typeof Focus.Type

export const focusedStarId = (focus: Focus): Option.Option<string> =>
  Focus.matchOrElse(focus, { Star: ({ starId }) => Option.some(starId) }, () =>
    Option.none(),
  )

export const focusedIdeaId = (focus: Focus): Option.Option<string> =>
  Focus.matchOrElse(focus, { Idea: ({ ideaId }) => Option.some(ideaId) }, () =>
    Option.none(),
  )

export const focusedTourId = (focus: Focus): Option.Option<string> =>
  Focus.matchOrElse(focus, { Tour: ({ tourId }) => Option.some(tourId) }, () =>
    Option.none(),
  )

export const isAtStop = (
  focus: Focus,
  tourId: string,
  stepIndex: number,
): boolean =>
  Focus.matchOrElse(
    focus,
    {
      Tour: current =>
        current.tourId === tourId && current.stepIndex === stepIndex,
    },
    () => false,
  )
