import type { Html, HtmlBuilder } from 'foldkit/html'

import { Message } from '../message'
import {
  SITE_TITLE,
  actionButtonView,
  eyebrowView,
  glyphView,
} from './primitives'

/** The title card, set low over the sky the way jem.computer sets its hero. */
export const arrivalView = (h: HtmlBuilder<Message>): Html =>
  h.section(
    [
      h.Class(
        'pointer-events-none absolute inset-x-0 bottom-[9svh] flex flex-col items-center px-6 text-center',
      ),
      h.AriaLabelledBy('arrival-title'),
    ],
    [
      eyebrowView(['Logic', 'machines', 'people'], h),
      h.h1(
        [
          h.Id('arrival-title'),
          h.Class(
            'mt-5 font-display text-[clamp(56px,8vw,148px)] font-[540] leading-[0.94] tracking-[-0.065em] text-ink [text-shadow:0_2px_30px_#4b0d57a6,0_0_3px_#ffefff35] [font-variant-ligatures:common-ligatures_discretionary-ligatures]',
          ),
        ],
        [
          h.span([h.Class('block')], [SITE_TITLE]),
          h.span(
            [
              h.Class(
                'mt-[0.22em] block text-[0.4em] leading-[1.25] tracking-[-0.045em] text-rose',
              ),
            ],
            ['a family tree of functional programming'],
          ),
        ],
      ),
      h.p(
        [h.Class('mt-6 max-w-[34rem] text-[18px] leading-snug text-pearl/80')],
        [
          'Distance from the core is time; each wedge is a tradition; every filament is an idea handed down, from Church’s λ-calculus in 1936 to the TypeScript you wrote this morning.',
        ],
      ),
      h.div(
        [
          h.Class(
            'pointer-events-auto mt-7 flex flex-wrap justify-center gap-3',
          ),
        ],
        [
          actionButtonView(
            {
              content: ['Watch it unfold', glyphView('✧', h)],
              onClick: Message.ClickedWatchHistory(),
              variant: 'Primary',
            },
            h,
          ),
          actionButtonView(
            {
              content: ['Explore the sky'],
              onClick: Message.ClickedExploreSky(),
              variant: 'Quiet',
            },
            h,
          ),
        ],
      ),
    ],
  )
