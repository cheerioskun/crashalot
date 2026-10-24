# Flight-phase Sankey: source and interpretation

The chart classifies accident records from operation type into their recorded accident phase. It does **not** trace a cohort of flights through takeoff, cruise and landing. The retained accident archive contains no successful-flight denominator, so a measured all-flight flow cannot be reconstructed from it. No synthetic journeys are added.

## Retained evidence

- Source: [MauroPello, PlaneCrashData](https://huggingface.co/datasets/MauroPello/planecrashdata), CC BY 4.0.
- Local file: `data/raw/planecrashdata.parquet`, retained snapshot downloaded October 23, 2026. No new datasets were fetched.
- Revision: `b817a96f2b9152b735c9c6570d465102f5f76c88`.
- SHA-256: `db334ffbab0cf67b06765038803338531fbfe23522c69b453cd8eb63a6c09b48`.
- Original file: 27,598 distinct record IDs. Included calendar years: 1970–2025, 13,193 distinct IDs. Year is the first four characters of nonempty `timestamp`; 2026 is excluded as an incomplete year.
- Default selection: the exact `flight_type == 'Scheduled Revenue Flight'` label, 2,946 records. Passenger-only coverage is unverified. The separate `Passenger - Scheduled` label is not silently merged into this cohort.

The optional all-operations view classifies the same 13,193 records into scheduled revenue, cargo, private, charter/air taxi, and other/unknown. Other/unknown includes all remaining labels, including military, training, business, missing labels, and `Passenger - Scheduled`. The aggregate JSON includes every raw group member, retained unknown values, and all 25 nonzero ribbons.

## Default cohort totals

| Recorded phase | Records | Share of 2,946 |
| --- | ---: | ---: |
| Takeoff / climb | 612 | 20.8% |
| En route | 657 | 22.3% |
| Approach / landing | 1,532 | 52.0% |
| Ground | 83 | 2.8% |
| Unknown / other | 62 | 2.1% |
| Total | 2,946 | 100.0% |

Phase mappings are explicit in `public/data/phase-sankey.json`: takeoff and initial climb map together; Flight and En route map together; approach, descent and landing map together; taxi, parking, standing and towing map to Ground. Missing and unmatched labels map to Unknown / other. There are 199 unknown/other records across all operations, including 197 missing phases and two manoeuvring labels. None are discarded.

The archive does not establish complete reporting coverage or per-phase exposure. Phase shares are conditional on inclusion in the accident archive. They are not flight accident probabilities, fatalities, time-normalized phase hazards, or evidence about short versus long journeys. These worldwide 1970–2025 records are a different population from the U.S. Part 121 count/rate chart; the chart's definition disclosure states that explicitly.

## Inspection and rendering

The implementation uses [d3-sankey](https://github.com/d3/d3-sankey), evaluated alongside the project's [awesome-d3](https://github.com/wbkd/awesome-d3) requirement. `sankey()` computes conserved proportional nodes and ribbons, and `sankeyLinkHorizontal()` renders the curves. No bespoke layout or animation engine is introduced.

Hover or keyboard-focus a ribbon for counts, cohort share and (in the all-operations view) share within its operation type. Click or Enter/Space pins that selection. Click again, Reset selection or Escape releases it. Source definitions, group mappings and a complete keyboard-readable table are disclosed beneath the chart. Four existing visualization-only colors encode the four known phase categories. Unknown / other uses the existing neutral `--viz-muted` token and a dashed node boundary. No palette tokens are added.

`mountPhaseSankey(container)` asynchronously loads the local aggregate and returns `{resize(), destroy()}`. A `ResizeObserver` handles initially hidden slide containers and layout changes. The chart has no Reveal.js dependency.

## Checks performed

The extract was generated with an ad hoc `uv run python` query against the retained Parquet, without saving a new inspection script. Checks confirmed included IDs are unique, all source operation and phase values are mapped, 25 ribbons sum to 13,193, the scheduled-revenue ribbons sum to 2,946, and the unknown/other group remains in every denominator. Independent count reconciliation is recorded in the implementation handoff.
