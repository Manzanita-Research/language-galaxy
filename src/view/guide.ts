import clsx from 'clsx'
import { Array, Match, Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Button, Tabs } from '@foldkit/ui'

import { ideas, linksCarrying, presentDay, tours } from '../domain/catalogue'
import {
  type Focus,
  focusedIdeaId,
  focusedStarId,
  focusedTourId,
} from '../domain/focus'
import type { Idea } from '../domain/idea'
import type { Star } from '../domain/star'
import type { Tour } from '../domain/tour'
import { OBSTRUCTION_ATTRIBUTE } from '../galaxy/scene'
import { Message } from '../message'
import { GuideTab, type Model } from '../model'
import {
  eyebrowClass,
  glyphView,
  ideaSwatchView,
  panelClass,
  starGlyphView,
} from './primitives'

/** Three ways into the galaxy: trace back from something you use today,
 *  follow one idea, or take a narrated journey. */
export const GuideTabs = Tabs.create<GuideTab>()

const tabLabel: Readonly<Record<GuideTab, string>> = {
  Today: 'Start from today',
  Ideas: 'Follow an idea',
  Journeys: 'Journeys',
}

const rowClass = (isCurrent: boolean): string =>
  clsx(
    'flex w-full cursor-pointer border text-left transition focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink',
    isCurrent
      ? 'border-pink/70 bg-pink/12 text-ink'
      : 'border-transparent text-pearl/90 hover:border-rule hover:text-ink',
  )

type GuideRowConfig = Readonly<{
  id: string
  isCurrent: boolean
  onClick: Message
  className: string
  content: ReadonlyArray<Html | string>
}>

/** One selectable row: the current selection is marked, not toggled. */
const guideRowView = (
  { id, isCurrent, onClick, className, content }: GuideRowConfig,
  h: HtmlBuilder<Message>,
): Html =>
  h.keyed('li')(
    id,
    [],
    [
      Button.view(
        {
          onClick,
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.AriaCurrent(isCurrent ? 'true' : 'false'),
                h.Class(className),
              ],
              content,
            ),
        },
        h,
      ),
    ],
  )

const introView = (text: string, h: HtmlBuilder<Message>): Html =>
  h.p([h.Class('mb-4 text-[16px] leading-snug text-pearl/70')], [text])

const todayStarView = (
  star: Star,
  focus: Focus,
  h: HtmlBuilder<Message>,
): Html => {
  const isCurrent = Option.contains(focusedStarId(focus), star.id)
  return guideRowView(
    {
      id: star.id,
      isCurrent,
      onClick: Message.ClickedStar({ starId: star.id }),
      className: clsx(
        rowClass(isCurrent),
        'items-baseline gap-2 px-2.5 py-1.5 text-[16px] leading-tight',
      ),
      content: [
        starGlyphView(star, h),
        h.span([h.Class('flex-1')], [star.name]),
        h.span(
          [h.Class('font-mono text-[10px] text-pearl/45')],
          [`${star.year}`],
        ),
      ],
    },
    h,
  )
}

type TodayGroup = Readonly<{
  id: string
  title: string
  stars: ReadonlyArray<Star>
}>

const todayGroupView = (
  group: TodayGroup,
  focus: Focus,
  h: HtmlBuilder<Message>,
): Html =>
  h.section(
    [h.Class('mb-5')],
    [
      h.h2(
        [h.Id(group.id), h.Class(clsx(eyebrowClass, 'mb-1.5'))],
        [group.title],
      ),
      h.ul(
        [h.Class('grid grid-cols-2 gap-x-1'), h.AriaLabelledBy(group.id)],
        Array.map(group.stars, star => todayStarView(star, focus, h)),
      ),
    ],
  )

const todayPanelView = (focus: Focus, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      introView(
        'Pick something you use. Its ancestry lights up, warm, all the way back to the core; what it passed on glows cool.',
        h,
      ),
      todayGroupView(
        {
          id: 'today-languages',
          title: 'Languages',
          stars: Array.filter(presentDay, star => star.kind === 'Language'),
        },
        focus,
        h,
      ),
      todayGroupView(
        {
          id: 'today-tools',
          title: 'Tools & libraries',
          stars: Array.filter(presentDay, star => star.kind === 'Tool'),
        },
        focus,
        h,
      ),
    ],
  )

const ideaRowView = (
  idea: Idea,
  focus: Focus,
  h: HtmlBuilder<Message>,
): Html => {
  const isCurrent = Option.contains(focusedIdeaId(focus), idea.id)
  const handoffCount = linksCarrying(idea.id).length
  return guideRowView(
    {
      id: idea.id,
      isCurrent,
      onClick: Message.ClickedIdea({ ideaId: idea.id }),
      className: clsx(rowClass(isCurrent), 'items-center gap-3 px-2.5 py-2'),
      content: [
        ideaSwatchView(idea.id, h),
        h.span([h.Class('flex-1 text-[16px] leading-tight')], [idea.name]),
        h.span(
          [h.Class('font-mono text-[10px] text-pearl/45')],
          [
            h.span([h.AriaHidden(true)], [`${handoffCount}`]),
            h.span([h.Class('sr-only')], [`, ${handoffCount} hand-offs`]),
          ],
        ),
      ],
    },
    h,
  )
}

const ideasPanelView = (focus: Focus, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      introView(
        'Each idea is a thread of light. Follow one from where it began to where you meet it now.',
        h,
      ),
      h.ul(
        [h.Class('flex flex-col')],
        Array.map(ideas, idea => ideaRowView(idea, focus, h)),
      ),
    ],
  )

const tourCardView = (
  tour: Tour,
  focus: Focus,
  h: HtmlBuilder<Message>,
): Html => {
  const isCurrent = Option.contains(focusedTourId(focus), tour.id)
  return guideRowView(
    {
      id: tour.id,
      isCurrent,
      onClick: Message.ClickedTour({ tourId: tour.id }),
      className: clsx(
        'group flex w-full cursor-pointer flex-col gap-1 border px-3.5 py-3 text-left transition focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink',
        isCurrent
          ? 'border-pink/70 bg-pink/12'
          : 'border-rule hover:border-pink/50 hover:bg-plum/40',
      ),
      content: [
        h.span(
          [
            h.Class(
              'font-display text-[22px] leading-[1.05] tracking-[-0.04em] text-ink',
            ),
          ],
          [tour.title],
        ),
        h.span(
          [h.Class('text-[15px] leading-snug text-pearl/70')],
          [tour.question],
        ),
        h.span(
          [
            h.Class(
              clsx(eyebrowClass, 'mt-1 text-pearl/45 group-hover:text-rose'),
            ),
          ],
          [`${tour.steps.length} stops `, glyphView('✧', h)],
        ),
      ],
    },
    h,
  )
}

const journeysPanelView = (focus: Focus, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      introView(
        'Narrated paths through the sky, each answering one question.',
        h,
      ),
      h.ul(
        [h.Class('flex flex-col gap-2')],
        Array.map(tours, tour => tourCardView(tour, focus, h)),
      ),
    ],
  )

const panelFor = (tab: GuideTab, focus: Focus, h: HtmlBuilder<Message>): Html =>
  Match.value(tab).pipe(
    Match.when('Today', () => todayPanelView(focus, h)),
    Match.when('Ideas', () => ideasPanelView(focus, h)),
    Match.when('Journeys', () => journeysPanelView(focus, h)),
    Match.exhaustive,
  )

const tabButtonClass =
  'flex-1 cursor-pointer border-b px-2 pb-2.5 pt-1 font-mono text-[10.5px] tracking-[0.12em] uppercase transition border-rule text-pearl/55 hover:text-pearl data-[selected]:border-pink data-[selected]:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink'

export const guideView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.aside(
    [
      h.Class(clsx(panelClass, 'flex min-h-0 flex-col')),
      h.DataAttribute(OBSTRUCTION_ATTRIBUTE, ''),
      h.AriaLabel('Guide'),
    ],
    [
      h.submodel({
        slotId: model.guideTabs.id,
        model: model.guideTabs,
        view: GuideTabs.view,
        viewInputs: {
          tabs: GuideTab.literals,
          selectedValue: model.guideTab,
          ariaLabel: 'Ways into the galaxy',
          toView: ({ tablist, tabs, activeIndex }) =>
            h.div(
              [h.Class('flex min-h-0 flex-1 flex-col')],
              [
                h.div(
                  [...tablist, h.Class('flex gap-1 px-4 pt-3')],
                  Array.map(tabs, tab =>
                    h.button(
                      [...tab.tab, h.Class(tabButtonClass)],
                      [tabLabel[tab.value]],
                    ),
                  ),
                ),
                ...Array.map(
                  Array.filter(tabs, tab => tab.index === activeIndex),
                  tab =>
                    h.div(
                      [
                        ...tab.panel,
                        h.Class(
                          'scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4',
                        ),
                      ],
                      [panelFor(tab.value, model.focus, h)],
                    ),
                ),
              ],
            ),
        },
        toParentMessage: message => Message.GotGuideTabsMessage({ message }),
      }),
    ],
  )
