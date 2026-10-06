import clsx from 'clsx'
import { Array } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import type { Tour, TourStep } from '../../domain/tour'
import { Message } from '../../message'
import {
  actionButtonView,
  eyebrowView,
  glyphView,
  starButtonView,
} from '../primitives'
import {
  detailTitleAttributes,
  proseClass,
  titleClass,
  wholeSkyButtonView,
} from './shared'

const snippetView = (
  label: string,
  source: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.figure(
    [h.Class('mt-3')],
    [
      h.figcaption(
        [
          h.Class(
            'mb-1 font-mono text-[10px] tracking-[0.12em] uppercase text-rose/70',
          ),
        ],
        [label],
      ),
      h.pre(
        [
          h.Class(
            'scrollbar-thin overflow-x-auto border border-rule bg-[#0d0a10cc] px-3.5 py-3 font-mono text-[12px] leading-[1.6] text-pearl/90',
          ),
        ],
        [h.code([], [source])],
      ),
    ],
  )

const stopDotView = (
  step: TourStep,
  index: number,
  stepIndex: number,
  h: HtmlBuilder<Message>,
): Html =>
  h.keyed('li')(
    step.star,
    [],
    [
      Button.view(
        {
          onClick: Message.ClickedTourStep({ stepIndex: index }),
          toView: attributes =>
            h.button([
              ...attributes.button,
              h.AriaLabel(`Stop ${index + 1}: ${step.title}`),
              h.AriaCurrent(index === stepIndex ? 'step' : 'false'),
              h.Class(
                clsx(
                  'block h-2 cursor-pointer rounded-full transition focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink',
                  index === stepIndex
                    ? 'w-6 bg-pink shadow-[0_0_10px_#ff78e1]'
                    : index < stepIndex
                      ? 'w-2 bg-rose/70 hover:bg-rose'
                      : 'w-2 bg-pearl/25 hover:bg-pearl/60',
                ),
              ),
            ]),
        },
        h,
      ),
    ],
  )

/** The stop's own words. Keyed by stop, so each stop starts fresh while the
 *  navigation around it keeps keyboard focus. */
const stopContentView = (step: TourStep, h: HtmlBuilder<Message>): Html =>
  h.keyed('div')(
    step.star,
    [],
    [
      h.h2(
        [...detailTitleAttributes(h), h.Class(clsx(titleClass, 'mt-3'))],
        [step.title],
      ),
      h.div([h.Class('mt-2')], [starButtonView(step.star, h)]),
      h.p([h.Class(proseClass)], [step.body]),
      ...Array.map(step.snippets, snippet =>
        snippetView(snippet.label, snippet.source, h),
      ),
    ],
  )

const stopNavigationView = (
  tour: Tour,
  stepIndex: number,
  h: HtmlBuilder<Message>,
): Html => {
  const isFirst = stepIndex === 0
  const isLast = stepIndex === tour.steps.length - 1
  return h.nav(
    [h.Class('mt-6 flex flex-col gap-4'), h.AriaLabel('Journey')],
    [
      h.ol(
        [h.Class('flex flex-wrap items-center gap-1.5')],
        Array.map(tour.steps, (step, index) =>
          stopDotView(step, index, stepIndex, h),
        ),
      ),
      h.div(
        [h.Class('flex items-center justify-between gap-2')],
        [
          actionButtonView(
            {
              content: [glyphView('←', h), 'Back'],
              onClick: Message.ClickedPreviousStep(),
              variant: 'Quiet',
              isDisabled: isFirst,
            },
            h,
          ),
          isLast
            ? actionButtonView(
                {
                  content: ['Finish', glyphView('✧', h)],
                  onClick: Message.ClickedFinishTour(),
                  variant: 'Primary',
                },
                h,
              )
            : actionButtonView(
                {
                  content: ['Next', glyphView('→', h)],
                  onClick: Message.ClickedNextStep(),
                  variant: 'Primary',
                },
                h,
              ),
        ],
      ),
      h.p(
        [
          h.Class(
            'font-mono text-[10px] tracking-[0.1em] uppercase text-pearl/35',
          ),
          h.AriaHidden(true),
        ],
        ['← → to move · esc to leave'],
      ),
    ],
  )
}

/** A stop on a narrated journey. */
export const tourView = (
  tour: Tour,
  step: TourStep,
  stepIndex: number,
  h: HtmlBuilder<Message>,
): Html =>
  h.keyed('article')(
    tour.id,
    [],
    [
      wholeSkyButtonView(h),
      eyebrowView(
        ['Journey', `Stop ${stepIndex + 1} of ${tour.steps.length}`],
        h,
      ),
      h.p(
        [
          h.Class(
            'mt-1 font-display text-[19px] leading-tight tracking-[-0.03em] text-rose',
          ),
        ],
        [tour.title],
      ),
      h.p(
        [h.Class('sr-only'), h.AriaLive('polite')],
        [`Stop ${stepIndex + 1} of ${tour.steps.length}: ${step.title}`],
      ),
      stopContentView(step, h),
      stopNavigationView(tour, stepIndex, h),
    ],
  )
