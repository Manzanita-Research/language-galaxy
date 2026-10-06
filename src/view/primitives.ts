import clsx from 'clsx'
import { Array, Option, pipe } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import { findIdea, findStar } from '../domain/catalogue'
import { constellations } from '../domain/constellation'
import { ideaColorHex } from '../domain/palette'
import type { Star, StarKind } from '../domain/star'
import { Message } from '../message'

export const SITE_TITLE = 'The Lambda Galaxy'

export const panelClass =
  'pointer-events-auto border border-rule bg-ground/72 backdrop-blur-xl shadow-[0_24px_80px_-24px_#0008]'

export const eyebrowClass =
  'font-mono text-[10.5px] leading-relaxed tracking-[0.14em] uppercase text-rose/80'

/** A mono, uppercase line with a small star between each part. */
export const eyebrowView = (
  parts: ReadonlyArray<string>,
  h: HtmlBuilder<Message>,
): Html =>
  h.p(
    [h.Class(eyebrowClass)],
    Array.flatMap(parts, (part, index) =>
      index === 0
        ? [part]
        : [
            h.span(
              [h.Class('mx-2 text-[9px] text-pink'), h.AriaHidden(true)],
              ['✦'],
            ),
            part,
          ],
    ),
  )

export const sectionHeadingView = (
  title: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.h3(
    [
      h.Class(
        'mt-6 mb-2.5 flex items-center gap-3 font-mono text-[10.5px] tracking-[0.14em] uppercase text-pearl/60 after:h-px after:flex-1 after:bg-rule',
      ),
    ],
    [title],
  )

export const kindGlyph: Readonly<Record<StarKind, string>> = {
  Field: '✺',
  Theory: '◎',
  Language: '✦',
  Tool: '⊙',
}

const starButtonClass =
  'group inline-flex cursor-pointer items-baseline gap-1.5 rounded-sm text-left text-pearl transition hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink'

export const starGlyphView = (star: Star, h: HtmlBuilder<Message>): Html =>
  h.span(
    [
      h.Class('text-[11px] leading-none'),
      h.Style({ color: constellations[star.constellation].color }),
      h.AriaHidden(true),
    ],
    [kindGlyph[star.kind]],
  )

/** A star's name as a button that brings it into focus. */
export const starButtonView = (starId: string, h: HtmlBuilder<Message>): Html =>
  pipe(
    findStar(starId),
    Option.match({
      onNone: () => h.span([], [starId]),
      onSome: star =>
        Button.view(
          {
            onClick: Message.ClickedRelatedStar({ starId }),
            toView: attributes =>
              h.button(
                [...attributes.button, h.Class(starButtonClass)],
                [
                  starGlyphView(star, h),
                  h.span(
                    [
                      h.Class(
                        'underline decoration-rule underline-offset-[3px] group-hover:decoration-pink',
                      ),
                    ],
                    [star.name],
                  ),
                  h.span(
                    [h.Class('font-mono text-[10px] text-pearl/50')],
                    [`${star.year}`],
                  ),
                ],
              ),
          },
          h,
        ),
    }),
  )

export const ideaSwatchView = (ideaId: string, h: HtmlBuilder<Message>): Html =>
  h.span([
    h.Class(
      'inline-block h-2 w-2 shrink-0 rounded-full shadow-[0_0_8px_currentColor]',
    ),
    h.Style({
      color: ideaColorHex(ideaId),
      backgroundColor: ideaColorHex(ideaId),
    }),
    h.AriaHidden(true),
  ])

/** An idea as a pill that follows its thread across the sky. */
export const ideaChipView = (ideaId: string, h: HtmlBuilder<Message>): Html =>
  pipe(
    findIdea(ideaId),
    Option.match({
      onNone: () => h.empty,
      onSome: idea =>
        Button.view(
          {
            onClick: Message.ClickedRelatedIdea({ ideaId }),
            toView: attributes =>
              h.button(
                [
                  ...attributes.button,
                  h.Class(
                    'inline-flex cursor-pointer items-center gap-2 border border-rule px-2.5 py-1 text-[15px] leading-tight text-pearl/90 transition hover:border-pink/60 hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink',
                  ),
                ],
                [ideaSwatchView(ideaId, h), idea.name],
              ),
          },
          h,
        ),
    }),
  )

/** A decorative glyph kept out of the accessible name. */
export const glyphView = (glyph: string, h: HtmlBuilder<Message>): Html =>
  h.span([h.AriaHidden(true)], [glyph])

export type ActionVariant = 'Primary' | 'Quiet'

const actionButtonClass = (variant: ActionVariant): string =>
  clsx(
    'inline-flex cursor-pointer items-center gap-2 px-3.5 py-2 font-mono text-[11px] tracking-[0.12em] uppercase transition focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-default disabled:opacity-35',
    variant === 'Quiet'
      ? 'border border-rule text-pearl/80 hover:border-pink/60 hover:text-ink'
      : 'border border-pink/70 bg-pink/12 text-ink hover:bg-pink/25 shadow-[0_0_24px_-6px_#ff78e1aa]',
  )

export type ActionButtonConfig = Readonly<{
  content: ReadonlyArray<Html | string>
  onClick: Message
  variant: ActionVariant
  isDisabled?: boolean
}>

/** The interface's one button shape: mono caps in a thin frame, glowing
 *  pink when it is the primary action. */
export const actionButtonView = (
  { content, onClick, variant, isDisabled = false }: ActionButtonConfig,
  h: HtmlBuilder<Message>,
): Html =>
  Button.view(
    {
      onClick,
      isDisabled,
      toView: attributes =>
        h.button(
          [...attributes.button, h.Class(actionButtonClass(variant))],
          content,
        ),
    },
    h,
  )
