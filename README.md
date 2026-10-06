# My Foldkit App

A Foldkit application built with Effect.

## Getting Started

```bash
pnpm install
pnpm dev
```

## Deploying

The app deploys to a Cloudflare Worker with [Alchemy](https://alchemy.run/cloudflare/frontend/foldkit/). The stack lives in [`alchemy.run.ts`](./alchemy.run.ts).

Put Cloudflare credentials in `.env` (gitignored), or run `pnpm alchemy profile edit` to log in with OAuth instead:

```bash
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=... # "Edit Cloudflare Workers" template + Account › Secrets Store › Edit
```

Then run:

```bash
pnpm run deploy   # builds with Vite and deploys the `prod` stage
pnpm run destroy  # tears it down
```

It serves at https://language-galaxy.jem.computer (the `jem.computer` zone must be in the same Cloudflare account). The first deploy to an account also creates Alchemy's state store (an `alchemy-state-store` Worker).

## Learn More

- [Foldkit Documentation](https://foldkit.dev)
- [Effect Documentation](https://effect.website)
- [Alchemy Documentation](https://alchemy.run)
