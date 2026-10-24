# D3 inspiration: candidates for discussion

October 24, 2026. **User instruction:** consult [awesome-d3](https://github.com/wbkd/awesome-d3) whenever a chart or animation mechanism is needed, before handrolling it. Inclusion does not establish maintenance, compatibility, or fit.

**Self-critique:** choosing D3 does not mean building every mechanism at the lowest level.

| Candidate | Observed capability | Possible application and unresolved fit |
| --- | --- | --- |
| [Billboard.js examples](https://naver.github.io/billboard.js/demo/) | D3-based standard charts; theme selector. | Compare against our hand-composed specimen before more custom code. Evaluate theme integration and accessibility. |
| [Potion](https://github.com/finnfiddle/potion) | React components for composing animated, interactive visualizations; verified directory link. | User-liked animation candidate, not installed or adopted. Check React integration, current compatibility, and maintenance before choosing it. |
| [D3FC](https://d3fc.io/) | Composable D3 charts, axes, brush/zoom, and annotations. | A possible middle layer when standard charts need composition. No dependency decision yet. |
| [D3FC brush zoom](https://d3fc.io/examples/brush-zoom/) | Rectangular selection; double-click reset; **no retained overview**. | Our near-100% proposal must retain full-scale context and label magnification. Exact fit and safe-share measurement remain unresolved. |
| [Interactive small multiples](https://d3fc.io/examples/interactive-small-multiples/) | Grid of charts with aligned scales. | Potential flight-category or phase comparison that reduces remembered comparisons between screens. Requires compatible evidence and units. |
| [d3-annotation](https://d3-annotation.susielu.com/) | Note, connector, and subject components, including threshold styles. | Direct labels at the 100% reference and residual gap. Documentation describes D3 v4; compatibility with current D3 v7 needs checking. |
| [Textures.js](https://riccardoscalco.it/textures/) | SVG pattern generators. | Missing/unknown categories distinguishable independently of color; meaningful encoding, not decoration. |
| [d3-iconarray](https://github.com/tomgp/d3-iconarray) | Creates grids of icons. | Reserve candidate for rarity metaphors. Millions of marks are illegible; grouping changes what one mark means and needs explicit units. |
| [d3-interpolate-path](https://github.com/pbeshai/d3-interpolate-path) | Interpolates paths with unequal point counts. | Unnecessary when the same annual marks merely change scale. Revisit only if point topology actually changes. |

## Agreed color rules and proposed design tests

- At least four visualization-only colors, separate from text/UI, with stronger background contrast and distinguishable series. Preserve category identity and geometry across themes; supplement color with labels and line styles. ColorBrewer Paired four-color candidates go to showcase review, not final adoption.
- Establish the story beat before optional exploration. Essential claims, definitions, and sources should not depend on discovering a hover target.
- Ask what understanding each mechanism adds before selecting it.

Library applications remain reversible proposals, without new data claims or asserted adoption. No final theme is chosen.
