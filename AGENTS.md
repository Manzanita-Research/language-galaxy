# Agent Development Notes

This is a Foldkit app. Read [`FOLDKIT.md`](./FOLDKIT.md) before writing any code in this project. It covers the architecture, the APIs, and the conventions the project is built on.

Foldkit owns `FOLDKIT.md` and replaces it whole on upgrade. This file is yours. Anything you want an agent to know about this project goes below, where an upgrade won't touch it.

`FOLDKIT.md` reads the line below to decide whether it has already offered to vendor the Foldkit source. Leave it in place.

subtree_prompted: true

## Project Notes

Domain vocabulary, deployment steps, local conventions that differ from Foldkit's defaults: write them here.

The Lambda Galaxy: an explorable family tree of functional programming, rendered as a WebGPU sky.

- **Vocabulary.** A _star_ is a language, theory, tool or field (`src/domain/star.ts`). A _link_ (filament) is a documented (`Direct`) or parallel (`Echo`) hand-off of _ideas_ between two stars. A _constellation_ is a tradition's wedge of sky. Distance from the core is birth year (`src/galaxy/layout.ts`). A _tour_ is a narrated path of steps.
- **Content** lives in `src/content/` as typed constants; `src/content/content.test.ts` checks referential integrity. Every claim should be defensible; prefer `Echo` when a hand-off isn't documented.
- **The sky** (`src/galaxy/`) is imperative and lives behind `MountSky` (`Mount.defineStream` in `src/command.ts`). Foldkit decides what is lit; `SyncSky` / `FrameSky` Commands push a `GalaxyScene` / `Framing` into the engine; clicks come back as Messages. `illuminate()` in `src/domain/illumination.ts` is the pure rule for what glows.
- **Shaders** are WGSL bodies in `src/galaxy/shaders.ts`, resolved by TypeGPU 0.12. Bound resources are written plainly (`frame`, `stars`) and qualified to `layout.$.name` by `bindTo`. WGSL reserves `from`, `target`, `smooth`, `filter`: don't use them as names. `shaders.test.ts` checks every entry point resolves.
- **Deploys** go through one Cloudflare Worker (`alchemy.run.ts`, `.github/workflows/ci.yml`). The `prod` stage owns the Worker and `language-galaxy.jem.computer`; every other stage (CI uses `pr-<number>`) uploads a version of it behind an aliased preview URL. Never give a preview stage its own Worker or domain.
- **Aesthetic** comes from `~/code/jem-computer/jem-computer-next` (palette in `celestial-colors.ts`, Sinistre / Terminal Grotesque / Commit Mono).
