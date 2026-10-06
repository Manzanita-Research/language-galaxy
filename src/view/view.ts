import clsx from 'clsx'
import { Option } from 'effect'
import type { Document, Html, HtmlBuilder } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import { MountSky } from '../command'
import { findIdea, findStar, findTour } from '../domain/catalogue'
import { FIRST_EPOCH, PRESENT } from '../domain/epoch'
import { Focus } from '../domain/focus'
import { Message } from '../message'
import { Arrival, type Model, Sky } from '../model'
import { aboutView } from './about'
import { arrivalView } from './arrival'
import { detailView } from './detail/panel'
import { guideView } from './guide'
import { SITE_TITLE, eyebrowView, panelClass } from './primitives'
import { timelineView } from './timeline'

const linkClass =
  'cursor-pointer border-b border-rule pb-0.5 text-pearl/90 transition hover:border-pink hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-ink'

const titled = (maybeName: Option.Option<string>): string =>
  Option.match(maybeName, {
    onNone: () => SITE_TITLE,
    onSome: name => `${name} · ${SITE_TITLE}`,
  })

const titleFor = (focus: Focus): string =>
  Focus.match(focus, {
    Overview: () => SITE_TITLE,
    Star: ({ starId }) =>
      titled(Option.map(findStar(starId), star => star.name)),
    Idea: ({ ideaId }) =>
      titled(Option.map(findIdea(ideaId), idea => idea.name)),
    Tour: ({ tourId }) =>
      titled(Option.map(findTour(tourId), tour => tour.title)),
  })

const skyHostView = (h: HtmlBuilder<Message>): Html =>
  h.div([
    h.Class('galaxy-host absolute inset-0'),
    h.AriaHidden(true),
    h.OnMount(MountSky()),
  ])

const siteNavView = (h: HtmlBuilder<Message>): Html =>
  h.nav(
    [
      h.Class('pointer-events-auto flex items-center gap-5 pt-1 text-[17px]'),
      h.AriaLabel('Site'),
    ],
    [
      Button.view(
        {
          onClick: Message.ClickedAbout(),
          toView: attributes =>
            h.button([...attributes.button, h.Class(linkClass)], ['About']),
        },
        h,
      ),
      h.a(
        [h.Href('https://jem.computer'), h.Class(linkClass)],
        ['Jem’s Computer'],
      ),
    ],
  )

/** While exploring, the site title is the page's heading. */
const wordmarkView = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      h.h1(
        [
          h.Class(
            'font-display text-[28px] font-normal leading-none tracking-[-0.06em] text-ink sm:text-[32px]',
          ),
        ],
        [SITE_TITLE],
      ),
      h.div(
        [h.Class('mt-1.5')],
        [
          eyebrowView(
            [
              'Functional programming',
              'a family tree',
              `${FIRST_EPOCH}–${PRESENT}`,
            ],
            h,
          ),
        ],
      ),
    ],
  )

const headerView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.header(
    [
      h.Class(
        clsx(
          'pointer-events-none flex items-start gap-6 px-5 pt-4 sm:px-6',
          model.arrival._tag === 'Exploring'
            ? 'justify-between'
            : 'justify-end',
        ),
      ),
    ],
    [
      Arrival.match(model.arrival, {
        Welcoming: () => h.empty,
        Exploring: () => wordmarkView(h),
      }),
      siteNavView(h),
    ],
  )

const unavailableView = (reason: string, h: HtmlBuilder<Message>): Html =>
  h.div(
    [
      h.Class(clsx(panelClass, 'mx-auto mt-4 max-w-md px-5 py-4 text-center')),
      h.Role('status'),
    ],
    [
      eyebrowView(['The sky is dark'], h),
      h.p(
        [h.Class('mt-2 text-[16px] leading-snug text-pearl/85')],
        [
          'This sky is drawn with WebGPU, and it isn’t available right now. Every star is still here in the guide.',
        ],
      ),
      h.p([h.Class('mt-2 font-mono text-[10.5px] text-pearl/45')], [reason]),
    ],
  )

const exploringView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [
      h.Class(
        'pointer-events-none flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 pt-3 sm:px-5',
      ),
    ],
    [
      Sky.match(model.sky, {
        Waking: () => h.empty,
        Live: () => h.empty,
        Unavailable: ({ reason }) => unavailableView(reason, h),
      }),
      h.div(
        [
          h.Class(
            'flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:items-stretch lg:justify-between',
          ),
        ],
        [
          h.div(
            [
              h.Class(
                'flex min-h-0 lg:w-[310px] lg:shrink-0 max-lg:max-h-[36svh] max-lg:order-2',
              ),
            ],
            [guideView(model, h)],
          ),
          h.div(
            [
              h.Class(
                'flex min-h-0 flex-col lg:w-[400px] lg:shrink-0 max-lg:mt-auto max-lg:max-h-[38svh]',
              ),
            ],
            [detailView(model, h)],
          ),
        ],
      ),
      timelineView(model, h),
    ],
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: titleFor(model.focus),
  lang: 'en',
  body: h.main(
    [
      h.Class(
        'relative h-svh w-full overflow-hidden bg-ground font-pixel text-pearl',
      ),
    ],
    [
      skyHostView(h),
      h.div(
        [h.Class('pointer-events-none absolute inset-0 flex flex-col')],
        [
          headerView(model, h),
          Arrival.match(model.arrival, {
            Welcoming: () => arrivalView(h),
            Exploring: () => exploringView(model, h),
          }),
        ],
      ),
      aboutView(model, h),
    ],
  ),
})
