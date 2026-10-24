# Draft 1: a change of perspective

Updated October 24, 2026. Implemented review draft following the user's request for more character, a climax right of the middle, and interactive count/rate and flight-phase graphs. Existing palette roles and theme alternatives are preserved. This is a local design iteration, not a final theme or final claim approval.

## Narrative and composition

The former sequence gave every page the same emphasis and saved the turning point for the end. This draft puts the climax at page 5 of 7, leaving exploration and a quieter resolution afterward.

| Page | Narrative job | Composition and action |
| --- | --- | --- |
| 1. A different view of flying | Invite the passenger into a question | Large sans-serif title with a serif change of emphasis; a neutral aircraft-window frame; visible team credit and safe-flight definition |
| 2. Start with what went wrong | Establish the events that attract attention | Annual fatal-accident lollipops with integer labels; hover, click, or keyboard year inspection |
| 3. How much flying? | Introduce exposure | Aligned absolute count and per-million-departure rate plots; shared selected year and exact departures; independently labeled zero-based vertical scales |
| 4. Same journey. Different view. | Pause before reframing | User-supplied two-passenger image and an invitation to bring departures into view |
| 5. Keep the events. Widen the frame. | Climax at roughly two-thirds through | Reader reveals 187,608,748 departures beside 17 fatal accidents; the pooled rate remains explicit; action is reversible |
| 6. Where in the journey? | Turn attention into further examination | Inspectable operation-to-recorded-phase Sankey; selected ribbon highlights and pins; scheduled-revenue/all-operation selector, unknowns retained, source table |
| 7. A wider view of flying | Resolve and return agency | Quiet echo of the opening question; links back to evidence and phases |

Character comes from composition, scale, asymmetry, and changes in density. The chart pages keep generous space and plain labels. Data colors remain separate from interface colors. The appearance selector is available in a small disclosure rather than dominating the experience. Existing Bootstrap, Sandstone, and Darkly treatments remain available.

## Evidence and its boundaries

Pages 2, 3, and 5 use the **same NTSB Part 121 passenger-and-cargo cohort, 2005–2024**. Counts are fatal accidents, including ground fatalities, rather than destroyed-aircraft crashes or passenger deaths. Counts fluctuate; no uninterrupted decline is asserted. Pooled rate = sum of fatal accidents / sum of departures × 1,000,000.

The intended near-100% **flights without a fatal accident** reveal remains a design alternative awaiting a valid flight-level measurement. The retained NTSB data explicitly leaves `safePercent` null. An enormous arithmetic-complement percentage would visually imply an observed safe-flight share despite a caveat. This draft therefore uses the supported count/exposure contrast as its working climax. It does not silently redefine “safe.” See [source audit](safety-trend-source.md).

The Sankey uses a **separate worldwide archive, 1970–2025**, with the change in scope visible above it. It classifies accident records into operation and recorded-phase groups. It does not trace successful flights through stages or estimate phase-specific risk. Scheduled revenue is the source label, not a verified passenger-only cohort. See [phase source notes](phase-sankey-source.md).

The earlier everyday-risk, flight-type risk, technical-intervention, and short-/long-haul claims remain possible extensions. They have not become supported conclusions or been discarded as ideas. They need compatible exposure or additional source evidence before entering the short narrative. The current archive's operation mix does not establish relative operational safety.

## Implementation and review

- Reveal.js hosts independent chart modules. D3 provides scales/axes; the documented `d3-sankey` library provides flow geometry. The awesome-d3 directory and documented options were consulted before implementation.
- Existing datasets only. New phase chart JSON is an aggregate of the retained Parquet snapshot, inspected with ad hoc commands; no new inspection scripts or downloaded datasets.
- Each graph has exact values and source definitions. Keyboard controls keep their focus behavior without advancing slides. Theme changes retain state and geometry.
- Two chart agents implemented the count views and Sankey; a third agent reviewed narrative alternatives and measurement limits. Parent reviewed and revised integration.
- Production build and desktop browser interaction checks passed. The remaining design judgment is whether this editorial/window treatment has the desired character; that requires user review.
