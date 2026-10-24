# Living design scratchpad

Updated October 24, 2026. Working notes from our conversation, **not an implementation specification**. Keep decisions, proposals, and unknowns distinct as our thinking changes. Historical research remains in the other documents; it does not silently settle current choices.

## Agreed working relationship

The user and main assistant design together. The main assistant holds the whole presentation in view as designer and reviewer; agents implement small, agreed pieces that can be integrated or returned with critique. A discussion is not authorization to build the whole experience.

Develop purpose, narrative, evidence, graphs, and meaningful interactions before committing to aesthetics. Revisit earlier choices when evidence changes them. Prefer OSS libraries and documented composition. If a bespoke component or visualization mechanism seems necessary, stop and deliberate with the user about the need and alternatives.

**Explicit user instruction:** whenever a chart or animation mechanism is needed, consult [awesome-d3](https://github.com/wbkd/awesome-d3) and relevant documented options before handrolling it. The user likes [Potion](https://github.com/finnfiddle/potion) for animation use cases. Record it as a preferred candidate to evaluate, not an installed or adopted dependency. Its React component model and current compatibility need checking against our HTML/D3 substrate.

The substrate is a new desktop-first HTML page hosted by Reveal.js, not Paper. **D3 is the agreed visualization engine.** Views should remain independent of the Reveal API. Scrollytelling remains possible; switching hosts may involve lifecycle and state handling as well as transitions. No theme is selected. Historical `d3-story-scenes` guidance remains in Git; its old renderer preferences are superseded, not restored wholesale.

## Current state: narrative redesign and requested graphs implemented

The user requested a more distinctive presentation, thought about its arc before implementation, a climax in the middle or right of the middle, and agents to implement interactive count/rate charts and an inspectable flight-phase Sankey.

The local review draft now has seven beats: invitation → annual fatal-accident counts → aligned counts/rates → a perspective hinge → count/exposure reveal → phase exploration → quiet return to the passenger. The working climax is page 5 of 7. The [draft 1 plan](draft-1-plan.md) records composition, interaction, evidence boundaries, and alternatives.

The design uses typographic scale, serif emphasis, a neutral window motif, and distinct page densities while preserving existing theme/data-color roles. No new theme is declared final. Bootstrap components and the earlier component showcase remain available.

The count chart and absolute/relative comparison share the verified NTSB cohort. The Sankey classifies the existing worldwide accident archive by operation and recorded phase; it does not fabricate an all-flight journey. Hover/focus and pin/reset reveal exact values; tables retain inspectable data. The supplied two-passenger reference is now included in the local draft's hinge page under public/assets/.

The original near-100% safe-flight concept remains unresolved by the retained data. The implementation uses the supported 17 fatal accidents / 187,608,748 departures contrast as a provisional working climax instead of presenting the arithmetic complement as an observed safe-flight share. This design choice is a reviewable proposal, not user agreement to abandon the original concept.

## Agreed data workflow

**Use existing project datasets exclusively; do not fetch new datasets.** Inspect the retained data using ad hoc queries (DuckDB is acceptable), rather than creating bespoke inspection scripts for each question. The assistant-authored `prepare_safety_trend.py` inspection/extraction script has been deleted at the user's request. Existing datasets and original project data tooling are retained; retention is not authorization to run new downloads. The saved NTSB audit remains historical evidence, not a promised executable reproduction workflow.

Future presentation assets belong in `public/assets/`, served by Vite at `/assets/`.

## Agreed color rules

Provide **at least four visualization-only colors**, separate from text and UI colors. Marks need stronger contrast against their background and distinguishable series. Themes must preserve category identity; labels and line styles supplement color rather than leaving meaning dependent on hue alone. Data geometry remains stable across themes.

Four-color candidates drawn from ColorBrewer Paired are intended for showcase review. Their selection for testing does not settle a final palette or theme.

## Agreed meaning of “safe”

For this story, **safe means a flight with no fatal accident**. The chart label should be **“Flights without a fatal accident”**; broader uses of “safe” need this qualification.

`Share = 1 − (flights involved in fatal accidents / all eligible flights)`

Numerator and denominator must cover the same population and period. This is not passenger survival probability; a flight without a fatal accident can still involve an accident or injuries. Source definitions must settle which fatalities count, including ground deaths. Accident-event counts cannot automatically substitute for flight counts: one event can involve multiple aircraft.

## Narrative intent and working intuition

Reassurance should be grounded in inspectable evidence. Shift attention from salient accidents toward the ordinary successful journeys that establish the denominator, without dismissing fear or hiding remaining risk.

The user's priorities are: improving absolute counts and rates; comparison with everyday risks; commercial passenger safety relative to other flights; technical safety improvements; and flight-phase patterns across short and long journeys. These are intended messages awaiting evidence, not established findings. Avoid promising annual decline, claiming all technical failure domains are conquered, or assuming short-/long-haul similarity. Risk comparisons need compatible outcomes and exposure.

The proposed climax inverts the question: the share without fatal accidents approaches **100%**, while its gap to 100% approaches zero. The gap may be so small that inspection requires zooming. Proposed treatment: establish the full scale, then magnify the gap while retaining a full-scale reference. Complementary frames must use identical cohorts, periods, and definitions; annual fluctuations remain honest.

The [two-passenger meme](references/same-journey-different-view.png) suggests **“Same journey. Different view.”** Proposed placement, not approved implementation: introduce it before inversion, asking “What changes if we look through the other window?” It reframes attention to the same evidence, not the facts themselves. The [flight-journey sketch](references/narrative-flight-sketch.png) can orient the experience without forcing graphs into flight shapes. Both images are supplied references; preservation does not establish ownership or publication rights.

Our design tests: does the first impression survive inspection? What new understanding does each interaction produce? Do grouping, metaphor, and aesthetics clarify the intended comparison? Positive framing must remain examinable.

The [D3 inspiration notes](d3-inspiration.md) separate observed library capabilities from candidate applications. They remain reversible research, with no new adoption or narrative commitment.

## Still open

- Eligible flight population, geography, period, and compatible numerator/denominator sources.
- User review of the implemented narrative order, editorial treatment, and interactions.
- Whether the tested Bootstrap/Bootswatch compositions fit, plus visual language and theme choice.

## Provisional evidence for the component specimen

The [NTSB source audit](safety-trend-source.md) establishes a matched 2005–2024 annual series for U.S. Part 121 air carriers, including passenger and cargo, scheduled and nonscheduled operations. Fatal-accident **counts and rates per departure** are verified and available for the live component specimen. The selected source population remains provisional for the final story.

Fatal accidents include ground fatalities. An aircraft-level audit resolves fatal-event versus eligible-aircraft multiplicity in this window, but the source does not directly enumerate completed flights linked to outcomes. Therefore an exact observed safe-flight share is not yet established: `safePercent` remains unset, and the mathematical rate complement must not silently acquire that label. This measurement question does **not** change the user's agreed meaning of safe or discard the planned 100% reveal.

The source-backed graph implementations and visual treatment are now reviewable locally. Final narrative scope, the near-100% measurement, and final theme choice remain open.
