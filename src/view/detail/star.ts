import clsx from 'clsx'
import { Array, Option, Order } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import {
  bequeathedBy,
  ideaName,
  inheritedBy,
  toursVisiting,
  yearOf,
} from '../../domain/catalogue'
import { constellations } from '../../domain/constellation'
import { type Link, linkId } from '../../domain/link'
import type { Star } from '../../domain/star'
import { Message } from '../../message'
import {
  actionButtonView,
  eyebrowView,
  ideaChipView,
  ideaSwatchView,
  sectionHeadingView,
  starButtonView,
} from '../primitives'
import {
  detailTitleAttributes,
  noteClass,
  proseClass,
  titleClass,
  wholeSkyButtonView,
} from './shared'

type Direction = 'Inherited' | 'Bequeathed'

const otherEnd = (direction: Direction, link: Link): string =>
  direction === 'Inherited' ? link.from : link.to

const byOtherEndYear = (direction: Direction): Order.Order<Link> =>
  Order.mapInput(Order.Number, (link: Link) =>
    Option.getOrElse(yearOf(otherEnd(direction, link)), () => 0),
  )

const echoBadgeView = (h: HtmlBuilder<Message>): Html =>
  h.span(
    [
      h.Class(
        'font-mono text-[9.5px] tracking-[0.14em] uppercase text-aqua/80',
      ),
      h.Title(
        'A parallel discovery or family resemblance, not a documented hand-off',
      ),
    ],
    ['echo'],
  )

const carriedIdeasView = (
  ideaIds: ReadonlyArray<string>,
  h: HtmlBuilder<Message>,
): Html =>
  h.ul(
    [
      h.Class('flex flex-wrap gap-x-2.5 gap-y-0.5'),
      h.AriaLabel('Ideas carried'),
    ],
    Array.map(ideaIds, ideaId =>
      h.keyed('li')(
        ideaId,
        [
          h.Class(
            'inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.04em] text-pearl/60',
          ),
        ],
        [ideaSwatchView(ideaId, h), ideaName(ideaId)],
      ),
    ),
  )

const linkRowView = (
  link: Link,
  direction: Direction,
  h: HtmlBuilder<Message>,
): Html =>
  h.keyed('li')(
    linkId(link),
    [h.Class('border-l border-rule py-1.5 pl-3')],
    [
      h.div(
        [h.Class('flex flex-wrap items-center gap-x-2 gap-y-1')],
        [
          starButtonView(otherEnd(direction, link), h),
          link.kind === 'Echo' ? echoBadgeView(h) : h.empty,
        ],
      ),
      carriedIdeasView(link.ideas, h),
      h.p([h.Class(noteClass)], [link.note]),
    ],
  )

const linkListView = (
  title: string,
  direction: Direction,
  links: ReadonlyArray<Link>,
  h: HtmlBuilder<Message>,
): Html =>
  Array.match(links, {
    onEmpty: () => h.empty,
    onNonEmpty: nonEmpty =>
      h.section(
        [],
        [
          sectionHeadingView(`${title} · ${nonEmpty.length}`, h),
          h.ul(
            [h.Class('flex flex-col gap-1')],
            Array.map(Array.sort(nonEmpty, byOtherEndYear(direction)), link =>
              linkRowView(link, direction, h),
            ),
          ),
        ],
      ),
  })

/** A star, the ideas it gave, and the filaments in and out of it. */
export const starView = (star: Star, h: HtmlBuilder<Message>): Html =>
  h.keyed('article')(
    star.id,
    [],
    [
      wholeSkyButtonView(h),
      eyebrowView(
        [star.kind, `${star.year}`, constellations[star.constellation].name],
        h,
      ),
      h.h2(
        [...detailTitleAttributes(h), h.Class(clsx(titleClass, 'mt-2'))],
        [star.name],
      ),
      h.p(
        [
          h.Class(
            'mt-2 font-display text-[21px] leading-tight tracking-[-0.03em] text-rose',
          ),
        ],
        [star.epithet],
      ),
      h.p(
        [h.Class('mt-2 font-mono text-[11px] leading-relaxed text-pearl/55')],
        [star.people],
      ),
      h.p([h.Class(proseClass)], [star.blurb]),
      Array.match(star.ideas, {
        onEmpty: () => h.empty,
        onNonEmpty: starIdeas =>
          h.section(
            [],
            [
              sectionHeadingView('Ideas it gave', h),
              h.ul(
                [h.Class('flex flex-wrap gap-1.5')],
                Array.map(starIdeas, ideaId =>
                  h.keyed('li')(ideaId, [], [ideaChipView(ideaId, h)]),
                ),
              ),
            ],
          ),
      }),
      linkListView('Inherited from', 'Inherited', inheritedBy(star.id), h),
      linkListView('Passed on to', 'Bequeathed', bequeathedBy(star.id), h),
      Array.match(toursVisiting(star.id), {
        onEmpty: () => h.empty,
        onNonEmpty: visiting =>
          h.section(
            [],
            [
              sectionHeadingView('Journeys through here', h),
              h.ul(
                [h.Class('flex flex-wrap gap-1.5')],
                Array.map(visiting, tour =>
                  h.keyed('li')(
                    tour.id,
                    [],
                    [
                      actionButtonView(
                        {
                          content: [tour.title],
                          onClick: Message.ClickedRelatedTour({
                            tourId: tour.id,
                            starId: star.id,
                          }),
                          variant: 'Quiet',
                        },
                        h,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
      }),
    ],
  )
