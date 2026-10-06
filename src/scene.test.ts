import {
  Command,
  Mount,
  click,
  expect,
  given,
  inside,
  keydown,
  role,
  scene,
  text,
} from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'
import { describe, test } from 'vitest'

import { Dialog, Tabs } from '@foldkit/ui'

import { FocusDetailTitle, FrameSky, MountSky, SyncSky } from './command'
import { FIRST_EPOCH } from './domain/epoch'
import { Focus } from './domain/focus'
import { Message, init, update, view } from './main'
import { Arrival } from './model'

const welcoming = init().model

const exploring = modifyFields(welcoming, {
  arrival: () => Arrival.Exploring(),
})

const wakeSky = Mount.resolve(MountSky, Message.SucceededMountSky())

const settleSky = Command.resolveAll(
  [SyncSky, Message.SucceededSyncSky()],
  [FrameSky, Message.SucceededFrameSky()],
  [FocusDetailTitle, Message.CompletedFocusDetailTitle()],
)

const focusTab = Command.resolve(
  Tabs.FocusTab,
  Tabs.Message.CompletedFocusTab(),
)

const details = role('complementary', { name: 'Details' })
const guide = role('complementary', { name: 'Guide' })

describe('arrival', () => {
  test('the title card offers two ways in', () => {
    scene(
      { update, view },
      given(welcoming),
      expect(
        role('heading', { level: 1, name: /The Lambda Galaxy/ }),
      ).toExist(),
      expect(role('button', { name: 'Watch it unfold' })).toExist(),
      expect(role('button', { name: 'Explore the sky' })).toExist(),
      wakeSky,
      settleSky,
    )
  })

  test('exploring reveals the guide, the details and time', () => {
    scene(
      { update, view },
      given(welcoming),
      wakeSky,
      settleSky,
      click(role('button', { name: 'Explore the sky' })),
      settleSky,
      expect(
        role('heading', { level: 1, name: 'The Lambda Galaxy' }),
      ).toExist(),
      expect(guide).toExist(),
      expect(details).toExist(),
      expect(role('heading', { name: 'Light from older stars' })).toExist(),
      expect(role('region', { name: 'Time' })).toExist(),
    )
  })
})

describe('tracing a lineage', () => {
  test('choosing a language from today shows what it inherited', () => {
    scene(
      { update, view },
      given(exploring),
      wakeSky,
      settleSky,
      inside(guide, click(role('button', { name: /Haskell/ }))),
      settleSky,
      inside(
        details,
        expect(role('heading', { name: 'Haskell' })).toExist(),
        expect(text(/Inherited from/)).toExist(),
        expect(text(/Passed on to/)).toExist(),
      ),
    )
  })

  test('the whole-sky button lets go of the star', () => {
    scene(
      { update, view },
      given(
        modifyFields(exploring, {
          focus: () => Focus.Star({ starId: 'lisp' }),
        }),
      ),
      wakeSky,
      settleSky,
      inside(details, click(role('button', { name: 'Whole sky' }))),
      settleSky,
      expect(role('heading', { name: 'Light from older stars' })).toExist(),
    )
  })
})

describe('following an idea', () => {
  test('an idea shows where it began and its hand-offs', () => {
    scene(
      { update, view },
      given(exploring),
      wakeSky,
      settleSky,
      inside(
        guide,
        click(role('tab', { name: 'Follow an idea' })),
        focusTab,
        click(role('button', { name: /Monads & do-notation/ })),
      ),
      settleSky,
      inside(
        details,
        expect(role('heading', { name: /Monads & do-notation/ })).toExist(),
        expect(text(/Where it began/)).toExist(),
        expect(text(/Its journey/)).toExist(),
      ),
    )
  })
})

describe('journeys', () => {
  test('a journey can be started and walked', () => {
    scene(
      { update, view },
      given(exploring),
      wakeSky,
      settleSky,
      inside(
        guide,
        click(role('tab', { name: 'Journeys' })),
        focusTab,
        click(role('button', { name: /Where Effect came from/ })),
      ),
      settleSky,
      inside(
        details,
        expect(text(/Stop 1 of/)).toExist(),
        expect(role('button', { name: 'Back' })).toBeDisabled(),
        click(role('button', { name: 'Next' })),
      ),
      settleSky,
      inside(details, expect(text(/Stop 2 of/)).toExist()),
    )
  })
})

describe('time', () => {
  test('play becomes pause while history plays', () => {
    scene(
      { update, view },
      given(exploring),
      wakeSky,
      settleSky,
      click(role('button', { name: 'Play' })),
      settleSky,
      expect(role('button', { name: 'Pause' })).toExist(),
      click(role('button', { name: 'Pause' })),
      settleSky,
      expect(role('button', { name: 'Play' })).toExist(),
    )
  })
})

describe('scrubbing time', () => {
  test('the year slider moves the sky back in time', () => {
    scene(
      { update, view },
      given(exploring),
      wakeSky,
      settleSky,
      keydown(role('slider', { name: 'Year shown in the sky' }), 'Home'),
      settleSky,
      expect(role('slider', { name: 'Year shown in the sky' })).toHaveAttr(
        'aria-valuenow',
        `${FIRST_EPOCH}`,
      ),
    )
  })
})

describe('about', () => {
  test('the about dialog explains the map', () => {
    scene(
      { update, view },
      given(exploring),
      wakeSky,
      settleSky,
      click(role('button', { name: 'About' })),
      Command.resolve(Dialog.ShowDialog, Dialog.Message.SucceededShowDialog()),
      Mount.resolve(
        Dialog.AcquireResources,
        Dialog.Message.SucceededAcquireResources(),
      ),
      expect(role('heading', { name: 'A map, not the territory' })).toExist(),
      expect(text(/Dashed filaments are echoes/)).toExist(),
    )
  })
})

describe('without WebGPU', () => {
  test('the dark sky says why and keeps the guide usable', () => {
    scene(
      { update, view },
      given(exploring),
      Mount.resolve(
        MountSky,
        Message.FailedMountSky({ reason: 'No adapter found' }),
      ),
      expect(role('status')).toExist(),
      expect(text(/The sky is dark/)).toExist(),
      expect(text('No adapter found')).toExist(),
      expect(guide).toExist(),
    )
  })

  test('a live sky shows no warning', () => {
    scene(
      { update, view },
      given(exploring),
      wakeSky,
      settleSky,
      expect(text(/The sky is dark/)).toBeAbsent(),
    )
  })
})
