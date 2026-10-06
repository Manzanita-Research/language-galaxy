import clsx from 'clsx'
import { Array } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Slider } from '@foldkit/ui'

import { FIRST_EPOCH, PRESENT } from '../domain/epoch'
import { OBSTRUCTION_ATTRIBUTE } from '../galaxy/scene'
import { Message } from '../message'
import { type Model, Playback } from '../model'
import { actionButtonView, glyphView, panelClass } from './primitives'

const TICK_YEARS: ReadonlyArray<number> = [
  1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020,
]

const fractionOf = (year: number): number =>
  (year - FIRST_EPOCH) / (PRESENT - FIRST_EPOCH)

const ticksView = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('pointer-events-none relative mt-1.5 h-3'), h.AriaHidden(true)],
    Array.map(TICK_YEARS, year =>
      h.span(
        [
          h.Class(
            'absolute -translate-x-1/2 font-mono text-[9.5px] tracking-[0.08em] text-pearl/40',
          ),
          h.Style({ left: `${fractionOf(year) * 100}%` }),
        ],
        [`${year}`],
      ),
    ),
  )

const playButtonView = (playback: Playback, h: HtmlBuilder<Message>): Html =>
  Playback.match(playback, {
    Paused: () =>
      actionButtonView(
        {
          content: [glyphView('▶', h), 'Play'],
          onClick: Message.ClickedPlay(),
          variant: 'Primary',
        },
        h,
      ),
    Playing: () =>
      actionButtonView(
        {
          content: [glyphView('❚❚', h), 'Pause'],
          onClick: Message.ClickedPause(),
          variant: 'Primary',
        },
        h,
      ),
  })

export const timelineView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.section(
    [
      h.Class(
        clsx(panelClass, 'flex items-center gap-4 px-4 py-3 sm:gap-6 sm:px-5'),
      ),
      h.DataAttribute(OBSTRUCTION_ATTRIBUTE, ''),
      h.AriaLabel('Time'),
    ],
    [
      playButtonView(model.playback, h),
      h.p(
        [
          h.Class(
            'w-[3.6ch] shrink-0 font-display text-[34px] leading-none tracking-[-0.05em] text-ink tabular-nums',
          ),
          h.AriaHidden(true),
        ],
        [`${Math.floor(model.epoch)}`],
      ),
      h.submodel({
        slotId: model.epochSlider.id,
        model: model.epochSlider,
        view: Slider.view,
        viewInputs: {
          value: model.epoch,
          ariaLabel: 'Year shown in the sky',
          formatValue: value => `${Math.floor(value)}`,
          toView: attributes =>
            h.div(
              [h.Class('min-w-0 flex-1')],
              [
                h.div(
                  [
                    ...attributes.root,
                    h.Class(
                      'relative flex h-6 w-full touch-none select-none items-center',
                    ),
                  ],
                  [
                    h.div(
                      [...attributes.track, h.Class('h-px w-full bg-pearl/25')],
                      [
                        h.div([
                          ...attributes.filledTrack,
                          h.Class(
                            'h-px bg-gradient-to-r from-violet via-pink to-gold shadow-[0_0_10px_#ff78e1]',
                          ),
                        ]),
                      ],
                    ),
                    h.div([
                      ...attributes.thumb,
                      h.Class(
                        'h-4 w-4 cursor-grab rounded-full border border-ink bg-pink shadow-[0_0_14px_#ff78e1] focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-ground data-[dragging]:cursor-grabbing',
                      ),
                    ]),
                  ],
                ),
                ticksView(h),
              ],
            ),
        },
        toParentMessage: message => Message.GotEpochSliderMessage({ message }),
      }),
      actionButtonView(
        {
          content: ['Now'],
          onClick: Message.ClickedNow(),
          variant: 'Quiet',
          isDisabled: model.epoch >= PRESENT,
        },
        h,
      ),
    ],
  )
