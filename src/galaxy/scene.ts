import { Array, Option, Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import {
  bequeathedBy,
  findTour,
  inheritedBy,
  linksCarrying,
  originsOf,
} from '../domain/catalogue'
import { Constellation } from '../domain/constellation'
import { Focus } from '../domain/focus'

/** Where the camera should travel to. */
export const Framing = defineTaggedUnion({
  Whole: {},
  Stars: { starIds: Schema.Array(Schema.String), maxZoom: Schema.Number },
})
export type Framing = typeof Framing.Type

/** The part of the screen no panel covers, in CSS pixels. */
export const FreeArea = Schema.Struct({
  left: Schema.Number,
  top: Schema.Number,
  right: Schema.Number,
  bottom: Schema.Number,
})
export type FreeArea = typeof FreeArea.Type

/** Marks an element the camera should frame around rather than behind. */
export const OBSTRUCTION_ATTRIBUTE = 'galaxy-obstruction'

/** Everything the sky needs to know about the Model, and nothing more. */
export const GalaxyScene = Schema.Struct({
  focus: Focus,
  epoch: Schema.Number,
  hiddenConstellations: Schema.Array(Constellation),
  /** On the title card the sky is scenery: no star labels. */
  isScenery: Schema.Boolean,
})
export type GalaxyScene = typeof GalaxyScene.Type

/** Facts the sky reports back. */
export const GalaxyEvent = defineTaggedUnion({
  ClickedStar: { starId: Schema.String },
  ClickedEmptySky: {},
  LostDevice: { reason: Schema.String },
})
export type GalaxyEvent = typeof GalaxyEvent.Type

const STAR_MAX_ZOOM = 3.2
const IDEA_MAX_ZOOM = 2.4
const TOUR_MAX_ZOOM = 3.4

const neighbourhoodOf = (starId: string): ReadonlyArray<string> => [
  starId,
  ...Array.map(inheritedBy(starId), link => link.from),
  ...Array.map(bequeathedBy(starId), link => link.to),
]

/** Frame a star with its parents and children, an idea with every star its
 *  thread touches, and a journey stop with the stop before it. */
export const framingFor = (focus: Focus): Framing =>
  Focus.match(focus, {
    Overview: () => Framing.Whole(),
    Star: ({ starId }) =>
      Framing.Stars({
        starIds: neighbourhoodOf(starId),
        maxZoom: STAR_MAX_ZOOM,
      }),
    Idea: ({ ideaId }) =>
      Framing.Stars({
        starIds: [
          ...Array.flatMap(linksCarrying(ideaId), link => [link.from, link.to]),
          ...Array.map(originsOf(ideaId), star => star.id),
        ],
        maxZoom: IDEA_MAX_ZOOM,
      }),
    Tour: ({ tourId, stepIndex }) =>
      Option.match(findTour(tourId), {
        onNone: () => Framing.Whole(),
        onSome: tour =>
          Framing.Stars({
            starIds: Array.getSomes(
              Array.map([stepIndex - 1, stepIndex], index =>
                Option.map(Array.get(tour.steps, index), step => step.star),
              ),
            ),
            maxZoom: TOUR_MAX_ZOOM,
          }),
      }),
  })
