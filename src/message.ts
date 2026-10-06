import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Dialog, Slider, Tabs } from '@foldkit/ui'

import { Constellation } from './domain/constellation'

export const Message = defineMessageUnion({
  SucceededMountSky: {},
  FailedMountSky: { reason: Schema.String },
  LostSkyDevice: { reason: Schema.String },
  ClickedStar: { starId: Schema.String },
  ClickedEmptySky: {},
  SucceededSyncSky: {},
  FailedSyncSky: { reason: Schema.String },
  SucceededFrameSky: {},
  FailedFrameSky: { reason: Schema.String },

  ClickedWatchHistory: {},
  ClickedExploreSky: {},

  GotGuideTabsMessage: { message: Tabs.Message },
  ClickedIdea: { ideaId: Schema.String },
  ClickedRelatedStar: { starId: Schema.String },
  ClickedRelatedIdea: { ideaId: Schema.String },
  ClickedRelatedTour: { tourId: Schema.String, starId: Schema.String },
  CompletedFocusDetailTitle: {},
  ClickedTour: { tourId: Schema.String },
  ClickedTourStep: { stepIndex: Schema.Int },
  ClickedNextStep: {},
  ClickedPreviousStep: {},
  ClickedFinishTour: {},
  ClickedWholeSky: {},
  ToggledConstellation: { constellation: Constellation },

  ClickedPlay: {},
  ClickedPause: {},
  ClickedNow: {},
  TickedPlayback: { deltaTime: Schema.Number },
  GotEpochSliderMessage: { message: Slider.Message },

  PressedEscape: {},
  PressedArrowRight: {},
  PressedArrowLeft: {},

  ClickedAbout: {},
  GotAboutDialogMessage: { message: Dialog.Message },
})
export type Message = typeof Message.Type
