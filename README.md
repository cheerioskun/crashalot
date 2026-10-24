# crashalot

An aviation data presentation for the 6730 group project. Narrative, evidence, charts, interactions, and visual language are developed together, desktop first. The presentation currently contains seven pages: a landing page and six question-led chapter previews. These previews do not represent finished visualizations.

## Run locally

```sh
npm ci
npm run dev
```

`npm run build` produces `dist/`; `npm run preview` serves that production build. Vite provides the development and build tooling. The existing `wrangler.jsonc` can serve `dist/` as Cloudflare static assets; this reset does not deploy anything.

## Design and implementation

The [living design scratchpad](docs/design-scratchpad.md) tracks current agreements, narrative proposals, and open questions.

Collaborative design precedes execution. Agents implement bounded, agreed pieces for review within the larger presentation. Prefer documented OSS libraries and component composition; discuss a need for bespoke components or visualization mechanisms together before building them.

Reveal.js is the presentation host. `index.html` is the entry point; `src/presentation.js` imports the standalone HTML fragments in `src/views/cover.html` and `src/views/chapters.html`, places them in the presentation, and initializes Reveal. D3 is the agreed visualization engine. View content remains separate from Reveal navigation. The [component study](components.html) remains a separate page at `/components.html`, comparing Bootstrap 5.3 with Bootswatch Sandstone and Darkly themes. This is a study for discussion, not an accepted final design language. The narrative is developing in the scratchpad. Moving to scrollytelling later may require adapting lifecycle and state handling as well as transitions.

Place future presentation assets in `public/assets/`; Vite serves them at `/assets/` and copies them into the build.

Use existing project datasets exclusively. Do not download more data or create bespoke inspection scripts for each question; use ad hoc queries over retained data instead. Original data tooling is preserved as historical project material.

## Retained material

- `docs/initial-brief.md`, `docs/sketch-analysis.md`, and `docs/experience-research.md`: historical context and evidence, not the current specification.
- `docs/sketches/`: the supplied drawings.
- `data/`: source provenance and locally retained datasets; see [data documentation](data/README.md).
- `scripts/`, `pyproject.toml`, and `uv.lock`: retained Python data tooling (`uv sync` to install).

The earlier website, chart gallery, generated gallery payload, previews, and project-local implementation skills have been removed. Git history retains them. `npm run data:prepare` is a historical gallery preparation command; its output is not required by the new page.

## Component study

`components.html` composes existing Bootstrap controls and a D3 evidence specimen. Theme choices persist locally. Library theme colors feed semantic chart roles; data and scales stay invariant. Bootswatch CSS is copied locally with its remote Google Fonts imports removed so the study uses one system font without runtime font requests. Run `npm run themes:prepare` after updating Bootswatch. Upstream license headers are retained in `src/vendor/`.
