# The Lambda Galaxy

An explorable family tree of functional programming. Every language, paper, tool and outside field is a star. Its distance from the core is the year it was born, and its wedge is the tradition it grew up in. Filaments are ideas handed down: solid ones are documented, dashed ones are echoes. Trace anything you use today back to Church's λ-calculus, follow one idea across the sky, or take a narrated journey.

Built with [Foldkit](https://foldkit.dev) (The Elm Architecture on Effect v4), rendered with WebGPU through [TypeGPU](https://typegpu.com), dressed in [jem.computer](https://jem.computer)'s palette and type.

```sh
pnpm install
pnpm dev        # http://127.0.0.1:5188
pnpm test       # story, scene, mount, content and shader tests
pnpm typecheck && pnpm lint
```

A browser with WebGPU is needed for the sky. Without it, the guide and panels still work.

- `src/content/` holds the catalogue: stars, links, ideas and tours.
- `src/domain/` holds pure rules: lineage, illumination, epochs and focus.
- `src/galaxy/` holds the imperative sky behind `MountSky`.
- `src/view/` holds the panels.

See `AGENTS.md` for the architecture notes.

## Deploying

The site is one Cloudflare Worker, built by [Alchemy](https://alchemy.run/cloudflare/frontend/foldkit/) from [`alchemy.run.ts`](./alchemy.run.ts) and deployed by `.github/workflows/ci.yml`:

- Every push to `main` deploys the `prod` stage to https://language-galaxy.jem.computer, once format, lint, typecheck and tests pass.
- Every pull request deploys a `pr-<number>` stage. Rather than create a Worker of its own, it uploads a version of the production Worker, served at `https://pr-<number>-<worker>.<account>.workers.dev` without taking production traffic. The PR's "View deployment" button links there. Each push re-points the URL, and closing the PR releases it.

The workflow reads `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` from the manzanita-research organization secrets. On GitHub's Free plan, organization secrets only reach public repositories. The token is the "Edit Cloudflare Workers" template plus Account › Secrets Store › Edit, which Alchemy uses to reach its state store.

To deploy by hand, put the same two variables in `.env` (gitignored), or run `pnpm alchemy profile edit` to log in with OAuth. Then run:

```sh
pnpm run deploy   # builds with Vite and deploys the `prod` stage
pnpm build && pnpm exec alchemy deploy --stage pr-123   # a preview version
pnpm run destroy  # tears it down
```

Use `pnpm run deploy`, not `pnpm deploy`, which is a different built-in pnpm command.
