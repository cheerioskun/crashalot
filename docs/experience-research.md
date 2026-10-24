# Interactive data experience: references and skills — historical reference

Researched October 22, 2026. Retained after the October 24 reset as historical research; its implementation guidance is not the current specification. This is a resource assessment, not a product specification or framework decision. Sources are primary author/project resources. The skills below are original synthesis, not copied tutorials.

## Main finding

Three complementary traditions are useful here: authored visual essays for pacing, focused visualization examples for implementation, and explorable explanations for reader agency. They do not require the same site structure. A guided story with optional investigation is a promising hypothesis, not an approved direction.

## References worth revisiting

| Reference | What to study | Possible use in crashalot | Limit |
| --- | --- | --- | --- |
| [The Pudding: Pockets](https://pudding.cool/2018/08/pockets/) | A concrete question, a guided comparison, object-selection interactions, and explicit methods | Introduce one clear aviation comparison before offering deeper filters | Borrow the explanatory structure rather than the appearance or tone |
| [The Pudding: storytelling](https://pudding.cool/process/how-to-make-dope-shit-part-3/) | Audience, framing, and why the story matters | Decide what the reader should understand before choosing charts | Does not dictate a flight metaphor or reassuring ending |
| [Sticky graphics](https://pudding.cool/process/scrollytelling-sticky/) and [Scrollama](https://github.com/russellsamora/scrollama) | Keep a graphic present while the explanation advances | Preserve context through a sequence of metric or cohort changes | Scrolling should remain native; transitions must be meaningful |
| [Responsive scrollytelling](https://pudding.cool/process/responsive-scrollytelling/) | Choose between preserving motion and stacking views on phones | Plan mobile as an explanatory design, not a shrunken desktop | The article is old; browser-specific advice needs updating |
| [Observable D3 gallery](https://observablehq.com/@d3/gallery), [brushable scatterplot](https://observablehq.com/@d3/brushable-scatterplot), [zoomable area chart](https://observablehq.com/@d3/zoomable-area-chart) | Small examples organized around a chart or interaction | Inspect records or time ranges after introducing a pattern | Notebook syntax and runtime assumptions need adaptation; no need to host with Observable |
| [Observable Plot interactions](https://observablehq.github.io/plot/features/interactions) | Details on demand and inputs with declarative charts | Quickly prototype alternative views and ordinary charts | The docs describe limitations around built-in selection, zoom, and animated incremental updates; check current APIs when building |
| [Bret Victor: Explorable Explanations](https://worrydream.com/ExplorableExplanations/) | Readers can inspect assumptions while following an authored explanation | Let readers test a comparison or definition within the story | A control must expose a meaningful assumption rather than create decorative activity |
| [Seeing Theory: Basic Probability](https://seeing-theory.brown.edu/basic-probability/index.html) | Repeated trials and linked theoretical/observed quantities | An explicitly hypothetical illustration of rare events | Archived reference; simulated results are not historical aviation evidence |
| [Setosa: Markov Chains](https://setosa.io/ev/markov-chains/) | Linked diagrams, parameters, and simulated sequences | Reference for explaining a mechanism through manipulation | It is not an aviation model; older implementation is not a starter stack |
| [Nicky Case: LOOPY](https://ncase.me/loopy/) | Manipulable systems models and visible feedback | Inspiration if the current idea involves systems and safety layers | A conceptual model cannot establish real causal effects from accident records |

The old [bl.ocks.org homepage](https://bl.ocks.org/) currently redirects to GitHub Gists. Treat historical blocks as a source-discovery route, not a working modern gallery. Prefer current D3/Observable examples and recover original Gists when a particular historical example matters. Check version and license per example.

## Skills ecosystem assessment

Used `npx --yes skills find scrollytelling` and `npx --yes skills find d3`, then inspected candidate source files and GitHub repository metadata. Install and star counts below are discovery snapshots, not evidence that a skill improves results.

| Candidate | Discovery signal | Source inspection | Decision |
| --- | --- | --- | --- |
| [nexu-io/open-design: d3-visualization](https://github.com/nexu-io/open-design/blob/main/skills/d3-visualization/SKILL.md) | CLI reported about 3.1K installs; repository API reported 103,318 stars | Its SKILL.md is a catalogue entry pointing to `jiannanya/snow-d3`, not the advertised full implementation guidance | Do not install a pointer as though it were the full skill |
| [MengTo/Skills: scroll-world-storytelling](https://github.com/MengTo/Skills/blob/main/agent-skills/web-design/scroll-world-storytelling/SKILL.md) | CLI reported about 1.5K installs; repository API reported 6,936 stars | Includes useful native-scroll, fallback, and verification guidance, but also fixes a cinematic journey, 5–7 beats, and a final action | Too prescriptive for the current discovery phase; keep as a reference |
| [Anthropic: frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) | Large official repository; API reported 182,985 stars | Useful typography, visual identity, and restraint advice; not a data-storytelling or D3 implementation workflow | Possible later supplement; not needed to fill this specific gap |

No third-party skill was installed. The CLI was used for discovery. Two project-local skills were synthesized instead:

- `editorial-data-experience` (removed; available in Git history): elicit the intended discovery, compare narrative forms, design meaningful interactions, and keep claims inspectable.
- `d3-story-scenes` (removed; available in Git history): choose Plot versus D3 by behavior; implement complete scene state, stable identity, native scrolling, responsive layouts, and accessible controls.

These were stored under `.agents/skills/` and were removed in the October 24 reset as superseded guidance. Their descriptions above document the earlier exploration, not instructions for the new presentation.

## What this suggests, without settling the design

A guided essay can keep scope clear but risks steering readers toward a predetermined conclusion. An investigation gives readers more agency but needs stronger onboarding and can become a dashboard. A simulation can make a mechanism tangible but requires justified assumptions and must be distinguished from observations. A hybrid is plausible, but has a higher implementation and explanation cost.

Before selecting one, identify the central moment of understanding and what the reader must do to reach it. That answer should determine the interaction and tool choices.
