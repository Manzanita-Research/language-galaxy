import clsx from 'clsx'
import { Array } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { linksCarrying, originsOf } from '../../domain/catalogue'
import type { Idea } from '../../domain/idea'
import { type Link, linkId } from '../../domain/link'
import { ideaColorHex } from '../../domain/palette'
import type { Message } from '../../message'
import { eyebrowView, sectionHeadingView, starButtonView } from '../primitives'
import {
  detailTitleAttributes,
  noteClass,
  proseClass,
  titleClass,
  wholeSkyButtonView,
} from './shared'

const ORIGINS_SHOWN = 4

const handoffView = (link: Link, h: HtmlBuilder<Message>): Html =>
  h.keyed('li')(
    linkId(link),
    [h.Class('border-l border-rule py-1.5 pl-3')],
    [
      h.div(
        [h.Class('flex flex-wrap items-center gap-x-2 gap-y-1')],
        [
          starButtonView(link.from, h),
          h.span([h.Class('text-pearl/40'), h.AriaHidden(true)], ['→']),
          starButtonView(link.to, h),
        ],
      ),
      h.p([h.Class(noteClass)], [link.note]),
    ],
  )

/** An idea: what it is, where it began, and every hand-off since. */
export const ideaView = (idea: Idea, h: HtmlBuilder<Message>): Html => {
  const handoffs = linksCarrying(idea.id)
  const color = ideaColorHex(idea.id)
  return h.keyed('article')(
    idea.id,
    [],
    [
      wholeSkyButtonView(h),
      eyebrowView(['Idea', `${handoffs.length} hand-offs`], h),
      h.h2(
        [...detailTitleAttributes(h), h.Class(clsx(titleClass, 'mt-2'))],
        [
          h.span([
            h.Class(
              'mr-3 inline-block h-3.5 w-3.5 translate-y-[-0.35em] rounded-full',
            ),
            h.Style({ backgroundColor: color, boxShadow: `0 0 16px ${color}` }),
            h.AriaHidden(true),
          ]),
          idea.name,
        ],
      ),
      h.p([h.Class(proseClass)], [idea.gloss]),
      h.p(
        [h.Class('mt-3 text-[15.5px] leading-snug text-pearl/70')],
        [h.span([h.Class('text-rose')], ['Today: ']), idea.today],
      ),
      Array.match(originsOf(idea.id), {
        onEmpty: () => h.empty,
        onNonEmpty: origins =>
          h.section(
            [],
            [
              sectionHeadingView('Where it began', h),
              h.ul(
                [h.Class('flex flex-wrap gap-x-4 gap-y-1')],
                Array.map(Array.take(origins, ORIGINS_SHOWN), star =>
                  h.keyed('li')(star.id, [], [starButtonView(star.id, h)]),
                ),
              ),
            ],
          ),
      }),
      Array.match(handoffs, {
        onEmpty: () => h.empty,
        onNonEmpty: nonEmpty =>
          h.section(
            [],
            [
              sectionHeadingView('Its journey', h),
              h.ul(
                [h.Class('flex flex-col gap-1')],
                Array.map(nonEmpty, link => handoffView(link, h)),
              ),
            ],
          ),
      }),
    ],
  )
}
