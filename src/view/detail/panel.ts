import clsx from 'clsx'
import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { findIdea, findStar, findTourStep } from '../../domain/catalogue'
import { Focus } from '../../domain/focus'
import { OBSTRUCTION_ATTRIBUTE } from '../../galaxy/scene'
import type { Message } from '../../message'
import type { Model } from '../../model'
import { panelClass } from '../primitives'
import { ideaView } from './idea'
import { overviewView } from './overview'
import { wholeSkyButtonView } from './shared'
import { starView } from './star'
import { tourView } from './tour'

const missingView = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      wholeSkyButtonView(h),
      h.p([h.Class('text-pearl/70')], ['That part of the sky is empty.']),
    ],
  )

const focusView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Focus.match(model.focus, {
    Overview: () => overviewView(model, h),
    Star: ({ starId }) =>
      Option.match(findStar(starId), {
        onNone: () => missingView(h),
        onSome: star => starView(star, h),
      }),
    Idea: ({ ideaId }) =>
      Option.match(findIdea(ideaId), {
        onNone: () => missingView(h),
        onSome: idea => ideaView(idea, h),
      }),
    Tour: ({ tourId, stepIndex }) =>
      Option.match(findTourStep(tourId, stepIndex), {
        onNone: () => missingView(h),
        onSome: ({ tour, step }) => tourView(tour, step, stepIndex, h),
      }),
  })

/** The right-hand panel: whatever the reader is attending to. */
export const detailView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.aside(
    [
      h.Class(
        clsx(
          panelClass,
          'scrollbar-thin min-h-0 overflow-y-auto px-5 pb-6 pt-5',
        ),
      ),
      h.DataAttribute(OBSTRUCTION_ATTRIBUTE, ''),
      h.AriaLabel('Details'),
    ],
    [focusView(model, h)],
  )
