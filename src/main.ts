import type { Runtime } from 'foldkit'

import { Dialog, Slider, Tabs } from '@foldkit/ui'

import { FIRST_EPOCH, PRESENT } from './domain/epoch'
import { Focus } from './domain/focus'
import type { Message } from './message'
import { Arrival, type Model, Playback, Sky } from './model'

export { Message } from './message'
export { Model } from './model'
export { subscriptions } from './subscription'
export { update } from './update'
export { view } from './view/view'

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: {
    focus: Focus.Overview(),
    epoch: PRESENT,
    playback: Playback.Paused(),
    hiddenConstellations: [],
    sky: Sky.Waking(),
    arrival: Arrival.Welcoming(),
    guideTabs: Tabs.init({ id: 'guide-tabs' }),
    guideTab: 'Today',
    epochSlider: Slider.init({
      id: 'epoch-slider',
      min: FIRST_EPOCH,
      max: PRESENT,
      step: 1,
    }),
    aboutDialog: Dialog.init({ id: 'about-dialog' }),
  },
})
