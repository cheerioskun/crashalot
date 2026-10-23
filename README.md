# crashalot

A group project for **6730 only**: an interactive website exploring aviation accidents, safety, and how people understand the risk of flying.

The experience is still being shaped. A static placeholder introduces three separate views, connected by ordinary anchor links. The view titles and order are provisional. See [the initial brief](docs/initial-brief.md) for historical context; it is not the current specification.

## Tooling

- Python and dependency management: `uv`
- Website tooling and dependencies: `npm`

Run `uv sync` to prepare the Python environment.

The website uses plain HTML/CSS and Vite, with no UI framework or runtime JavaScript:

```sh
npm ci
npm run dev
```

Run `npm run build` to generate `dist/`, and `npm run preview` to preview that production build.

For Cloudflare Workers, import this repository, use `npm run build` as the build command and `npx wrangler deploy` as the deploy command. The included `wrangler.jsonc` serves `dist/` as static assets. Hosting has not been deployed as part of this setup.

## Layout

- `docs/`: project context and design decisions
- `index.html` and `src/styles.css`: the placeholder website
- `public/`: static assets
- `data/`: data documentation; raw and generated data are ignored by default
- `.agents/skills/`: shared agent guidance for editorial experience design and interactive chart implementation

See [experience research](docs/experience-research.md) for references, skill assessments, and possible design directions.

No dataset or data visualizations are included yet. The route illustration is decorative and does not represent flight data.
