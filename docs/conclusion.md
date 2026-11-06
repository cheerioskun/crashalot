# Closing narration and Fin

The eighth chapter is an atmospheric ending, with no quantitative chart or new aviation dataset. It keeps the user's confident narration and the existing light/dark controls.

| Beat | Narration / action | Motion and reading hold |
| --- | --- | --- |
| 0 | There’s really nothing to fear. | Title, then 1.8 s |
| 1 | We’ve come a long way. And we’re getting better still. | 650 ms fade + 3.2 s |
| 2 | Technology | 500 ms fade + 450 ms |
| 2.3 | Protocols | 500 ms fade + 450 ms |
| 2.6 | Policy | 500 ms fade + 650 ms |
| 3 | on all fronts, really. | 500 ms fade + 1.8 s |
| 4 | So lean your seat back and relax. You’ll have a safe flight :) | Earlier copy fades, globe eases to a quieter pace; waits for explicit Next |
| F | Globe and narration fade; F is written | 2.2 s including scene transition, then 280 ms |
| i | Undotted i is written | 800 ms, then 180 ms |
| n | n is written, followed by the i-dot | 1.8 s; the dot occupies the final 16%, after the n is complete |

Earlier narration accumulates until the farewell replaces it. Auto never opens the Fin scene without an explicit Next, and never changes slides. Letter reveals use the same Pause/Space/Back semantics as the rest of the presentation. Manual mode keeps Next available while letters are incomplete. Once the dot is placed, the navigation rail disappears and “Back to the beginning” appears. This button reloads at Welcome so the entire story, including its reveal states and default Auto setting, starts again; the user's saved theme remains.

The globe uses D3's orthographic spherical projection, shaded ocean/land and six illustrative raised connections originating at Atlanta. A single light travels along one route at a time. These are compositional city connections, not an airline schedule, measured traffic, or an encoded safety metric. Ambient motion stops when the slide is inactive, the end card opens, or the tab is hidden. Reduced motion freezes the globe and presents settled narration / lettering, while preserving the explicit Next boundary.

## Artwork and offline use

- Land geometry: [Natural Earth 1:110m land](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson), stripped of unused properties and rounded to three decimal places. [Natural Earth terms](https://www.naturalearthdata.com/about/terms-of-use/) place the map data in the public domain.
- Letter outlines: [Pinyon Script](https://github.com/google/fonts/tree/main/ofl/pinyonscript), Copyright 2024 The Pinyon Project Authors, SIL Open Font License 1.1. The retained license is `src/assets/conclusion/PinyonScript-OFL.txt`. Filled outlines preserve the calligraphic nib contrast; SVG masks trace the pen movement, with the i-dot separated from the body.
- Authoring references: [D3 orthographic projection](https://d3js.org/d3-geo/azimuthal#geoOrthographic), [spherical interpolation](https://d3js.org/d3-geo/math#geoInterpolate).

Prepared geometry and paths live in `src/assets/conclusion/`. Source URLs and original-input hashes are retained in `sources.json`. To regenerate the art on a developer machine: `uv run --with fonttools python scripts/prepare_conclusion_art.py`. No font, map, CDN or image download occurs at runtime. The offline Windows export embeds the conclusion alongside the other chapters and includes the font license.
