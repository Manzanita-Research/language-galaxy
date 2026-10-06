import { Effect, Option, Stream } from 'effect'
import { Mount } from 'foldkit'
import { describe, expect, test } from 'vitest'

import { MountSky } from './command'
import { Message } from './message'

describe('MountSky', () => {
  test('reports a dark sky when the browser has no WebGPU', async () => {
    const host = document.createElement('div')
    const firstMessage = await Effect.runPromise(
      Effect.scoped(
        MountSky()
          .f(host, Stream.make(Mount.ViewState.make('Live')))
          .pipe(Stream.runHead),
      ),
    )
    expect(firstMessage).toEqual(
      Option.some(
        Message.FailedMountSky({
          reason: 'This browser does not support WebGPU yet.',
        }),
      ),
    )
    expect(host.querySelector('canvas')).toBeNull()
  })
})
