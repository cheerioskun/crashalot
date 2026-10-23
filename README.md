# crashalot

A group project for **6730 only**: an interactive website exploring aviation accidents, safety, and how people understand the risk of flying.

The experience is still being shaped. A static placeholder introduces three separate views, connected by ordinary anchor links. The view titles and order are provisional. See [the initial brief](docs/initial-brief.md) for historical context; it is not the current specification.

## Tooling

- Python and dependency management: `uv`
- Website tooling and dependencies: `npm`

Run `uv sync` to prepare the Python environment.

The website uses plain HTML/CSS, JavaScript, D3, and Vite, with no UI framework:

```sh
npm ci
npm run dev
```

Run `npm run build` to generate `dist/`, and `npm run preview` to preview that production build.

Open `/sketches/` for eight interactive D3 prototypes based on the group's drawings. The gallery uses a portrait layout on phones and a narrow reading surface with plain margins on desktop. Observed records and constructed interaction examples are labeled separately. See [the sketch analysis](docs/sketch-analysis.md) for reasoning and [data documentation](data/README.md) for downloaded sources, licenses, and reproducibility.

For Cloudflare Workers, import this repository, use `npm run build` as the build command and `npx wrangler deploy` as the deploy command. The included `wrangler.jsonc` serves `dist/` as static assets. Hosting has not been deployed as part of this setup.

## Layout

- `docs/`: project context and design decisions
- `index.html` and `src/styles.css`: the placeholder website
- `public/`: static assets
- `data/`: data documentation; raw and generated data are ignored by default
- `.agents/skills/`: shared agent guidance for editorial experience design and interactive chart implementation

See [experience research](docs/experience-research.md) for references, skill assessments, and possible design directions.

Raw datasets are stored locally and ignored by Git; the small reviewed chart inputs are tracked under `public/data/`. The opening-page route illustration is decorative and does not represent flight data.
