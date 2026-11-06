# Linked flight-phase and recorded-cause chapter

Integrated November 5, 2026. This supersedes the older operation→phase component for the presentation’s `flight-phase` chapter; that component remains in the separate component study. The approved prototype’s sequential Sankey and Nivo AreaBump are preserved, with the website’s existing editorial typography, theme palette, and navigation.

## Narrative and interaction

This is now slide 5, immediately after the worldwide decade trend. **Where in a flight do these crashes happen?** narrows the period from 1950–2024 to 1970–2024.

The current sequence has eleven cues, separating each flow reveal from its cause explanation:

| Beat | Reading cue / action |
| --- | --- |
| 0 | The slide title, with a quiet reserved stage. |
| 1 | “Three broad phases.” A short width/count reading key. |
| 1.5 | “First, departure.” About 22% of plotted crashes; departure draws. |
| 2 | Departure’s leading causes: human factor 215 and technical failure 181. |
| 2.5 | “Then, in flight.” About 23%; no additional records yet. |
| 3 | In-flight records draw; departure stays visible with reduced emphasis. |
| 3.5 | In-flight leading causes: human factor 267 and technical failure 168. |
| 4 | “Finally, arrival.” About 55%; no additional records yet. |
| 4.5 | Arrival records draw, preserving earlier geometry. |
| 5 | Arrival’s human-factor classification accounts for over half of that phase. |
| 5.5 | “Arrival accounts for over half.” Full phase counts and exploration controls. |

Both charts use the same 2,792 source IDs with a known airborne phase. The 82 ground records and 62 missing phases are retained in the canonical JSON and source disclosure, but excluded from both plotted charts and the phase-share denominator. The user explicitly removed their branch and filter from the story. Percentages are 610/2,792, 655/2,792, and 1,527/2,792, rounded to 22%, 23%, and 55%.

Each phase draws left to right on desktop and top to bottom on mobile through consecutive Sankey links. Widths and node positions use the final plotted cohort throughout, so completed bands stay fixed. Earlier phases remain visible with lower opacity when the next phase is introduced. A bounded 80 ms data paint updates the cause chart and counters from the same committed memberships, while the path front advances on each D3 animation frame. Per-cause deterministic prefixes of original source IDs construct each phase; this is a visual build, not chronological crash order.

The phase motions take 2.1 / 2.1 / 2.6 seconds, with distinct short transition holds and longer text-reading holds. Auto takes about 27.2 seconds and stops on the full view. Headings fade as whole phrases. Phase filters appear when the reveal is complete; Pause, Replay and Show full view remain available during it. Source details preserve interpretation limits without adding them as an extra story beat. The lower cause chart’s membership summary updates during the reveal instead of retaining its initial zero-count message. Next, Back, Manual, tab visibility and reduced motion keep the shared slide-local transport behavior.

Selecting a phase explicitly finishes the reveal, pauses Auto, and focuses the selected cohort in the Sankey, commentary, and cause chart. Cause/period selections, measure changes, or opening source details also pause the reveal for inspection. Show full view provides an explicit skip. Leaving and returning preserves progress and selections. Clear selection or Escape finishes the reveal and resets phase/highlight while preserving the measure.

The page scrolls within its slide viewport. Compare causes below focuses the cause heading. Keyboard controls remain isolated from presentation navigation, and the exact-values table supplies a keyboard path to every period/cause selection.

### Commentary evidence

All commentary is descriptive of this source cohort. The leading two displayed causes, calculated from the retained source IDs, are:

| Phase | Human factor | Technical failure | Phase total |
| --- | ---: | ---: | ---: |
| Departure | 215 | 181 | 610 |
| In flight | 267 | 168 | 655 |
| Arrival | 859 | 271 | 1,527 |

Human factor plus technical failure account for most departure records (396/610). Human factor leads in flight. On arrival, human factor alone accounts for over half (859/1,527). These statements describe recorded classifications, without inferring unrecorded failure domains or phase risk.

## Source and scope

- Existing retained source: `data/raw/planecrashdata.parquet`; no new dataset downloaded.
- Dataset: MauroPello/planecrashdata, revision `b817a96f2b9152b735c9c6570d465102f5f76c88`; publisher-declared CC BY 4.0.
- Locked retained-file SHA-256: `db334ffbab0cf67b06765038803338531fbfe23522c69b453cd8eb63a6c09b48`, from `data/sources.json`.
- Exact filter: `flight_type == "Scheduled Revenue Flight"`, year ≥ 1970 and < 2025. 2025 is the right boundary, not an included data year. Separate `Passenger - Scheduled` records are not merged.
- 2,936 canonical distinct original record IDs, dates 1970-01-05 through 2024-12-29. These are archive aircraft-occurrence records, not verified unique incidents or the population of operated flights.
- The retained Parquet and prototype CSV were independently compared during integration: IDs, raw phase, raw cause, and year agree for all 2,936 included records.

| Recorded phase group | Records |
| --- | ---: |
| Departure / takeoff / climb | 610 |
| In flight | 655 |
| Arrival / descent / approach / landing | 1,527 |
| Ground | 82 |
| Missing phase | 62 |

The plotted cohort is the 2,792 known-airborne records. They split into 610 departure and 2,182 later-phase records; those later records split into 655 in flight and 1,527 arrival. A later recorded phase supports the displayed classification sequence; it does not establish successful operation of earlier phases, observed flight trajectories, or a phase-specific probability of crashing.

## AreaBump semantics

Eleven equally spaced five-year periods run from 1970–1974 through 2020–2024. Tick labels appear at regular intervals appropriate to the viewport; every period retains its tick and datum. Nivo ranks ribbon order separately at each period and anchors the layout at the bottom. Smooth crossings interpolate the display; they are not observations between periods.

| Displayed cause | Records |
| --- | ---: |
| Weather | 152 |
| Technical | 620 |
| Human Factor | 1,341 |
| Intentional Acts | 68 |

The area view displays 2,181 records from the plotted airborne cohort. Others (109) and Not Recorded (502) remain in canonical records and the Sankey; their omission from AreaBump is disclosed below it, with counts recalculated for the current phase filter. The source provides broad cause categories, not reviewed engine/systems/structure/maintenance domains.

Count uses raw records. Percentage divides each displayed cause count by the sum of the four displayed causes in the same phase-selected period. It does not divide by all archive records or flight exposure. Empty periods keep their position and use a zero value; the exact table shows “—” when there is no denominator. When units change, Nivo is remounted to avoid interpolating between incompatible count/share scales; ordinary within-unit selection changes use restrained motion. Reduced-motion users receive immediate changes.

## Portable source and identity contract

`data/flight-exploration-rules.json` owns the exact filter, maps, period policy, and display/denominator definition. `scripts/build_flight_exploration.py` reads only the retained snapshot, verifies its checksum and unique IDs, fails on unmapped categories, and checks the period partition. It writes the committed `public/data/flight-exploration.json`: source receipt, rules checksum, named projection columns, preserved source IDs/raw labels, normalized fields, and count audit. The view applies its explicit known-airborne-phase filter to that canonical projection; the JSON retains all 2,936 records. No HTML embeds a separately edited copy of the data. The presentation loads this JSON locally; React, Nivo, D3, and themes are bundled by Vite, with no chart CDN dependency.

Rebuild with `npm run data:flight`; verify without mutation with `uv run python scripts/build_flight_exploration.py --check`. The retained raw file is ignored by Git; a fresh checkout runs the presentation from its committed reviewed JSON. Regeneration requires the matching retained source, not a new unpinned download.

The component’s bubbling `flight-safety:selection` and backward-compatible `flight-phase:select` events contain dataset/revision, filter, period policy, phase cohort, optional cause/period highlight, measure, original string `recordIds`, namespaced snapshot keys, and displayed-cause denominator IDs. `phaseFilter` names the three plotted phase groups. Keys are `MauroPello/planecrashdata@REVISION:ID`; they do not assert stability across upstream rewrites. Both charts read the same record projection and recompute memberships from those identities. Display labels and array positions are never join keys.

## Verification

- `npm run build`: production bundle succeeds.
- `npm run test:flight`: production-browser tests cover exact linked IDs and denominator arithmetic; count/percentage state retention; keyboard controls versus Reveal navigation; Next/Back state preservation; Escape; theme changes; mobile overflow; reduced motion; and explicit cause-jump focus.
- `tests/flight-reveal.spec.js` verifies partial-reveal IDs, per-phase counts and leaders, both-chart membership, cumulative cause cells, slide order, natural completion, Pause/Resume, Back/Replay, and waiting for explicit Next.
- The browser check caught and fixed a Reveal integration hazard: the area region uses a `div role="region"`, because nested `section` elements would be interpreted as additional slides.
- [Motion/interaction review](flight-exploration-motion-review.md): independent code/screenshot PASS. That review does not establish assistive-technology usability or independently validate source classifications.

Source completeness, reporting changes, event-level reconciliation, and exposure-based safety claims remain outside this chapter’s evidence. The presentation makes no claim that a change in recorded cause counts proves why aviation became safer.

## Reading-time adjustment — November 6, 2026

The user requested more space between the second- and fifth-slide beats. Sankey text/reading holds are now 1,100 / 3,200 / 650 / 3,400 / 1,700 / 650 / 3,400 / 1,800 / 700 / 3,800 ms. Phase drawing durations remain 2,100 / 2,100 / 2,600 ms; the additional time is for orientation, percentages, and cause comparisons rather than slower path motion. Total Auto time rises from 19.55 to 27.2 seconds, then waits for explicit Next.

## Transition to the flight-type comparison

After the full phase view, an explicit Next reveals “But these are not all the same flights.” A second Next opens the annual frequency-trail comparison. This twelfth cue never opens automatically. Back restores the completed phase chart and its selected cohort/cell. Overview retains the completed chart preview.
