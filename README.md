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
