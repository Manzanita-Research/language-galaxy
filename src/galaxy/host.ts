import { Option } from 'effect'

import type { GalaxyEngine } from './engine'

const enginesByHostId = new Map<string, GalaxyEngine>()

/** Stash the live engine against its host id so Commands can reach it
 *  without putting a mutable GPU object in the Model. The Mount that
 *  creates the engine pairs every `registerEngine` with a `forgetEngine`. */
export const registerEngine = (hostId: string, engine: GalaxyEngine): void => {
  enginesByHostId.set(hostId, engine)
}

export const findEngine = (hostId: string): Option.Option<GalaxyEngine> =>
  Option.fromNullishOr(enginesByHostId.get(hostId))

/** Forget an engine, unless a newer Mount has already replaced it. */
export const forgetEngine = (hostId: string, engine: GalaxyEngine): void => {
  if (enginesByHostId.get(hostId) === engine) {
    enginesByHostId.delete(hostId)
  }
}
