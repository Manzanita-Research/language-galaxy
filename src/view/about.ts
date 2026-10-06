import type { Html, HtmlBuilder } from 'foldkit/html'

import { Dialog } from '@foldkit/ui'

import { links, stars } from '../domain/catalogue'
import { Message } from '../message'
import type { Model } from '../model'
import { eyebrowView } from './primitives'

const paragraphClass = 'mt-3 text-[16.5px] leading-snug text-pearl/85'

export const aboutView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: model.aboutDialog.id,
    model: model.aboutDialog,
    view: Dialog.view,
    viewInputs: {
      hasDescription: true,
      toView: ({
        dialog,
        backdrop,
        panel,
        closeButton,
        title,
        description,
        isVisible,
      }) =>
        h.dialog(
          [
            ...dialog,
            h.Class('bg-transparent p-0 open:flex items-center justify-center'),
          ],
          isVisible
            ? [
                h.div([
                  ...backdrop,
                  h.Class('fixed inset-0 bg-[#0b080dcc] backdrop-blur-sm'),
                ]),
                h.div(
                  [
                    ...panel,
                    h.Class(
                      'relative mx-4 max-w-xl border border-rule bg-ground/95 px-7 py-6 font-pixel text-pearl shadow-[0_30px_120px_-30px_#c478ff66]',
                    ),
                  ],
                  [
                    eyebrowView(
                      [
                        'About',
                        `${stars.length} stars`,
                        `${links.length} filaments`,
                      ],
                      h,
                    ),
                    h.h2(
                      [
                        ...title,
                        h.Class(
                          'mt-2 font-display text-[40px] leading-none tracking-[-0.055em] text-ink',
                        ),
                      ],
                      ['A map, not the territory'],
                    ),
                    h.p(
                      [...description, h.Class(paragraphClass)],
                      [
                        'Each star is a language, paper, tool or field. Its distance from the core is the year it was born; its wedge is the tradition it grew up in. The selection favours the story of functional programming and the neighbours it grew up beside.',
                      ],
                    ),
                    h.p(
                      [h.Class(paragraphClass)],
                      [
                        'Solid filaments are documented hand-offs: someone cited it, said so, or carried the idea across themselves. Dashed filaments are echoes: the same idea found twice, or a strong family resemblance without a paper trail.',
                      ],
                    ),
                    h.p(
                      [h.Class(paragraphClass)],
                      [
                        'Built with Foldkit, which is The Elm Architecture on Effect v4, so this page is one of its own stars. The sky is WebGPU through TypeGPU. Type and colour come from jem.computer.',
                      ],
                    ),
                    h.div(
                      [h.Class('mt-6 flex justify-end')],
                      [
                        h.button(
                          [
                            ...closeButton,
                            h.Class(
                              'cursor-pointer border border-rule px-3.5 py-2 font-mono text-[11px] tracking-[0.12em] uppercase text-pearl/80 transition hover:border-pink/60 hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink',
                            ),
                          ],
                          ['Back to the sky'],
                        ),
                      ],
                    ),
                  ],
                ),
              ]
            : [],
        ),
    },
    toParentMessage: message => Message.GotAboutDialogMessage({ message }),
  })
