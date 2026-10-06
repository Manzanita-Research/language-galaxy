import { Option, Schema } from 'effect'
import { Subscription } from 'foldkit'

import { Slider } from '@foldkit/ui'

import { Message } from './message'
import type { Model } from './model'

const timeAndKeys = Subscription.make<Model, Message>()(entry => ({
  playback: Subscription.animationFrame({
    isActive: model => model.playback._tag === 'Playing',
    toMessage: deltaTime => Message.TickedPlayback({ deltaTime }),
  }),
  keys: entry(
    { isTouring: Schema.Boolean, isAboutOpen: Schema.Boolean },
    {
      modelToDependencies: model => ({
        isTouring: model.focus._tag === 'Tour',
        isAboutOpen: model.aboutDialog.isOpen,
      }),
      dependenciesToStream: ({ isTouring, isAboutOpen }) =>
        Subscription.keyBindings<Message>({
          bindings: [
            {
              keys: 'Escape',
              isEnabled: !isAboutOpen,
              preventDefault: false,
              mapEvent: () => Message.PressedEscape(),
            },
            {
              keys: 'ArrowRight',
              isEnabled: isTouring && !isAboutOpen,
              mapEvent: () => Message.PressedArrowRight(),
            },
            {
              keys: 'ArrowLeft',
              isEnabled: isTouring && !isAboutOpen,
              mapEvent: () => Message.PressedArrowLeft(),
            },
          ],
        }),
    },
  ),
}))

const epochSlider = Subscription.lift({
  epochSliderPointer: Slider.subscriptions.dragPointer,
  epochSliderEscape: Slider.subscriptions.dragEscape,
})<Model, Message>({
  read: model => Option.some(model.epochSlider),
  toParentMessage: message => Message.GotEpochSliderMessage({ message }),
})

export const subscriptions = Subscription.aggregate(timeAndKeys, epochSlider)
