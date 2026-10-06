import type { Html, HtmlBuilder } from 'foldkit/html'

import { DETAIL_TITLE_ID } from '../../command'
import { Message } from '../../message'
import { actionButtonView, glyphView } from '../primitives'

export const titleClass =
  'font-display text-[clamp(34px,3vw,46px)] leading-[0.98] tracking-[-0.055em] text-ink'

export const proseClass = 'mt-3 text-[17px] leading-snug text-pearl/90'

export const noteClass = 'mt-0.5 text-[14.5px] leading-snug text-pearl/65'

/** The panel's heading, where focus lands after a link inside it. */
export const detailTitleAttributes = (h: HtmlBuilder<Message>) => [
  h.Id(DETAIL_TITLE_ID),
  h.Tabindex(-1),
]

export const wholeSkyButtonView = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('mb-4')],
    [
      actionButtonView(
        {
          content: [glyphView('←', h), 'Whole sky'],
          onClick: Message.ClickedWholeSky(),
          variant: 'Quiet',
        },
        h,
      ),
    ],
  )
