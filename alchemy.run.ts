import * as Alchemy from 'alchemy'
import * as Cloudflare from 'alchemy/Cloudflare'
import * as Config from 'effect/Config'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

/** The stage that serves the custom domain. */
const PRODUCTION_STAGE = 'prod'
const DOMAIN = 'language-galaxy.jem.computer'

/** Every other stage (CI uses `pr-<number>`) uploads a version of the
 *  production Worker instead of creating a Worker of its own. Live traffic
 *  stays on production; the version is served at a stable preview URL,
 *  `<stage>-<worker>.<account>.workers.dev`, that each push re-points. */
const previewOfProduction = (stage: string) =>
  Effect.gen(function* () {
    const production = yield* Cloudflare.Worker.ref('Website', {
      stage: PRODUCTION_STAGE,
    })
    const maybeCommit = yield* Config.option(Config.String('GITHUB_SHA'))
    return yield* Cloudflare.Website.Foldkit('Website', {
      version: {
        parent: production,
        alias: stage,
        message: `Preview: ${stage}`,
        ...Option.match(maybeCommit, {
          onNone: () => ({}),
          onSome: commit => ({ tag: commit }),
        }),
      },
    })
  })

export default Alchemy.Stack(
  'LanguageGalaxy',
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const stage = yield* Alchemy.Stage
    const website =
      stage === PRODUCTION_STAGE
        ? yield* Cloudflare.Website.Foldkit('Website', { domain: DOMAIN })
        : yield* previewOfProduction(stage)
    return { url: website.url }
  }),
)
