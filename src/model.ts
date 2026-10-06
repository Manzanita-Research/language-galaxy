import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { Dialog, Slider, Tabs } from '@foldkit/ui'

import { Constellation } from './domain/constellation'
import { Focus } from './domain/focus'

export const GuideTab = Schema.Literals(['Today', 'Ideas', 'Journeys'])
export type GuideTab = typeof GuideTab.Type

export const Playback = defineTaggedUnion({ Paused: {}, Playing: {} })
export type Playback = typeof Playback.Type

/** The WebGPU sky's lifecycle. `Unavailable` keeps the panels useful when a
 *  browser has no WebGPU. */
export const Sky = defineTaggedUnion({
  Waking: {},
  Live: {},
  Unavailable: { reason: Schema.String },
})
export type Sky = typeof Sky.Type

/** The title card shows once; after that the reader is exploring. */
export const Arrival = defineTaggedUnion({ Welcoming: {}, Exploring: {} })
export type Arrival = typeof Arrival.Type

export const Model = Schema.Struct({
  focus: Focus,
  /** The year the sky is showing: everything born later is still in the
   *  future, behind the light-front. */
  epoch: Schema.Number,
  playback: Playback,
  hiddenConstellations: Schema.Array(Constellation),
  sky: Sky,
  arrival: Arrival,
  guideTabs: Tabs.Model,
  guideTab: GuideTab,
  epochSlider: Slider.Model,
  aboutDialog: Dialog.Model,
})
export type Model = typeof Model.Type
