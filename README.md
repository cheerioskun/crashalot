# crashalot

A group project for **6730 only**: an interactive website exploring aviation accidents, safety, and how people understand the risk of flying.

The experience and its technical architecture are still being shaped. See [the initial brief](docs/initial-brief.md) for historical context; it is not the current specification.

## Tooling

- Python and dependency management: `uv`
- Website tooling and dependencies: `npm`

Run `uv sync` to prepare the Python environment. The npm package is a placeholder; a framework and website commands will be chosen after the experience is defined.

## Layout

- `docs/`: project context and design decisions
- `data/`: data documentation; raw and generated data are ignored by default
- `.agents/skills/`: shared agent guidance for editorial experience design and interactive chart implementation

See [experience research](docs/experience-research.md) for references, skill assessments, and possible design directions.

No dataset or website implementation is included yet.
