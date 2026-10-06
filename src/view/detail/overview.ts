import clsx from 'clsx'
import { Array } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import {
  type Constellation,
  constellationOrder,
  constellations,
} from '../../domain/constellation'
import { Message } from '../../message'
import type { Model } from '../../model'
import { eyebrowView, kindGlyph, sectionHeadingView } from '../primitives'
import { detailTitleAttributes, titleClass } from './shared'

type LegendEntry = Readonly<{ glyph: string; title: string; text: string }>

const legend: ReadonlyArray<LegendEntry> = [
  {
    glyph: kindGlyph.Language,
    title: 'Languages',
    text: 'flare with four spikes.',
  },
  {
    glyph: kindGlyph.Theory,
    title: 'Theories and papers',
    text: 'ring like pulsars.',
  },
  {
    glyph: kindGlyph.Tool,
    title: 'Tools and libraries',
    text: 'are orbs with a moon.',
  },
  {
    glyph: kindGlyph.Field,
    title: 'Fields',
    text: 'outside programming are nebulae that fed ideas in.',
  },
  { glyph: '—', title: 'Solid filaments', text: 'are documented hand-offs.' },
  {
    glyph: '┄',
    title: 'Dashed filaments',
    text: 'are echoes: the same idea found twice.',
  },
]

const legendRowView = (
  { glyph, title, text }: LegendEntry,
  h: HtmlBuilder<Message>,
): Html =>
  h.li(
    [h.Class('flex gap-3')],
    [
      h.span(
        [
          h.Class('w-5 shrink-0 text-center text-[15px] text-rose'),
          h.AriaHidden(true),
        ],
        [glyph],
      ),
      h.span(
        [h.Class('text-[15.5px] leading-snug text-pearl/80')],
        [h.span([h.Class('text-ink')], [title]), ` ${text}`],
      ),
    ],
  )

const constellationToggleView = (
  constellation: Constellation,
  hidden: ReadonlyArray<Constellation>,
  h: HtmlBuilder<Message>,
): Html => {
  const info = constellations[constellation]
  const isShown = !Array.contains(hidden, constellation)
  return h.keyed('li')(
    constellation,
    [],
    [
      Button.view(
        {
          onClick: Message.ToggledConstellation({ constellation }),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.AriaPressed(isShown ? 'true' : 'false'),
                h.Class(
                  clsx(
                    'flex w-full cursor-pointer items-start gap-2.5 py-1.5 text-left transition focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink',
                    isShown ? 'opacity-100' : 'opacity-40 hover:opacity-70',
                  ),
                ),
              ],
              [
                h.span([
                  h.Class('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border'),
                  h.Style({
                    borderColor: info.color,
                    backgroundColor: isShown ? info.color : 'transparent',
                    boxShadow: isShown ? `0 0 10px ${info.color}` : 'none',
                  }),
                  h.AriaHidden(true),
                ]),
                h.span(
                  [h.Class('flex flex-col')],
                  [
                    h.span(
                      [h.Class('text-[16px] leading-tight text-ink')],
                      [info.name],
                    ),
                    h.span(
                      [h.Class('text-[14px] leading-snug text-pearl/55')],
                      [
                        info.motto,
                        info.isFunctional ? '' : ' · a neighbouring tradition',
                      ],
                    ),
                  ],
                ),
              ],
            ),
        },
        h,
      ),
    ],
  )
}

/** How to read the sky, and which traditions are showing. */
export const overviewView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      eyebrowView(['How to read', 'this sky'], h),
      h.h2(
        [...detailTitleAttributes(h), h.Class(clsx(titleClass, 'mt-2'))],
        ['Light from older stars'],
      ),
      h.p(
        [h.Class('mt-3 text-[17px] leading-snug text-pearl/85')],
        [
          'Every idea you use was handed down. Here, distance from the core is time: Church’s λ-calculus glows at the centre in 1936, and the rim is today. Each wedge is a tradition.',
        ],
      ),
      h.ul(
        [h.Class('mt-4 flex flex-col gap-2')],
        Array.map(legend, entry => legendRowView(entry, h)),
      ),
      sectionHeadingView('Traditions', h),
      h.p(
        [h.Class('mb-1 text-[14.5px] leading-snug text-pearl/55')],
        ['Hide a tradition to see what grew without it.'],
      ),
      h.ul(
        [],
        Array.map(constellationOrder, constellation =>
          constellationToggleView(constellation, model.hiddenConstellations, h),
        ),
      ),
    ],
  )
