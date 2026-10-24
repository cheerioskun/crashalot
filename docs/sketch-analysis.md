# Sketch analysis and prototype decisions — historical reference

Written October 23, 2026; retained after the October 24 reset for its evidence and reasoning. The gallery and its implementation have been removed; Git history retains them. References below to prototypes describe those historical experiments. The phone-first direction is superseded by a desktop-first, collaboratively designed HTML presentation hosted by Reveal.js. The supplied sketches are exploration proposals, not evidence that their drawn trends or numeric examples hold. Originals are retained in [sketches](sketches/).

## Historical experience direction

The audience encounters this on a phone, plausibly via a QR code. Design a portrait browser experience first, with plain outer margins on larger screens. A passenger sees a **drawn**, not photographic, seatback pouch. Picking up the safety card brings it into focus and transitions out of the seat. Later views inherit the card's illustration language without necessarily retaining a fixed paper rectangle.

The experience must explain itself. It has no presenter supplying missing narrative. Interactions should let readers investigate, compare, and form conclusions, rather than reveal a predetermined argument one slide at a time. The gallery is a laboratory for those interactions, not the final visual treatment or narrative order. It deliberately does not implement a full cabin intro yet.

## Reading the supplied pages

The notebook's first two time plots pose different questions: the count of recorded accidents by flight type, and risk relative to growing flight activity. Its proposed zoom-out makes the denominator itself a reveal. That is more valuable than simply animating a descending line. The danger is treating incompatible sources as a valid numerator and denominator.

The field of dots uses scale and inspection to make rarity tangible. “Each dot = many flights” becomes misleading if a whole aggregated dot is colored as one crash flight. The prototype instead outlines a **block containing** a constructed accident and lets readers inspect its 1,000 individual flights. Zooming preserves the constructed total. This is an interaction test, not an empirical estimate.

The windows-through-decades drawing uses a repeated passenger object to anchor time. A phone cannot display four miniature windows and two full graphs legibly at once. The prototype keeps one view and lets the reader scrub through years, switch source flight types, and add indexed departure context. Window illustrations could later be a period selector; they should not replace quantitative axes. Full accident history is retained locally, but the chart period is bounded explicitly.

The flight-type bar sketch is a comparison of outcomes among recorded accidents. Its handwritten 5%, 65%, 25%, and 45% are not treated as data. With the specified pooled calculation, the local snapshot gives approximately **38.4%, 60.7%, 47.5%, and 57.7%** for scheduled revenue, private, charter/taxi, and corporate/business, respectively. These are conditional onboard fatality fractions in usable accident records, not real-world flight risk. Switching to record counts exposes the difference between those measures. Scheduled revenue is not verified passenger-only travel. A claim that commercial passenger flying is safer requires a compatible exposure dataset and population definition beyond this chart.

The stacked-cause sketch appears to propose that technical failures shrink as human factors occupy more of the stack. A percentage stack alone cannot tell us whether a cause's absolute count falls. Its original shapes are hypotheses. The prototype switches between annual shares and counts, retains an unknown category, and allows the same comparison for scheduled revenue. The source has one broad cause label; it is not a comprehensive, independent causal investigation.

The technical matrix asks a useful next question: what is hidden by the broad label? The source has no structured engine/systems/structure/maintenance field. The prototype tests the matrix with explicit **narrative keyword mentions** within records labeled technical failure. Mentions overlap and can include negation or an impact description—“engine” is not proof of engine failure, “wing” is not proof of structural failure. Selecting a cell exposes the denominator and source excerpts so this limitation is inspectable. A validated taxonomy or manual coding would be needed before presenting it as a breakdown of failures.

The phase-flow sketch follows one cohort through successive stages and branches failures off into a small sink. Its strength is conservation and the visual contrast between all flights and the rare branches. The accident file contains no successful flights, so a measured all-flight Sankey cannot be built from it alone. The prototype uses an explicitly constructed 100,000-flight cohort, preserves ribbon scale, and switches to the 11 accident flights to magnify branch composition. This is one of the few experiments that genuinely needs a different denominator to answer its two questions.

The paired trajectory sketch suggests comparing short and long flights by matching the pattern of phase circles. The source cannot supply that comparison: no verified duration or distance field is available, and it combines takeoff/climb and approach/landing. The prototype uses those broad airborne categories and compares actual flight-type cohorts instead. Circle **area** represents share of accident records; the trajectory is symbolic. Ground and unknown/other categories remain in the denominator and are disclosed below. A phase's share of accidents is not its hazard per minute; phase exposure is required for that.

The milestone sketch has a strong progressive-disclosure idea, but the annotated line could imply causation. The prototype lets readers choose sourced U.S. GPWS/TAWS regulatory context against a global scheduled-revenue count series, with the jurisdiction and inference limits explicit. The [FAA's March 29, 2000 rule](https://www.govinfo.gov/content/pkg/FR-2000-03-29/pdf/00-7595.pdf) recounts the 1974 GPWS requirement and establishes the later TAWS requirement; publication, effective date, adoption, and compliance are different dates. This chart cannot isolate either technology's effect.

## What Distill contributes

[Communicating with Interactive Articles](https://distill.pub/2020/communicating-with-interactive-articles/) examines how interactive articles explain and engage readers. [A Visual Exploration of Gaussian Processes](https://distill.pub/2019/visual-exploration-gaussian-processes/) builds an explanation from small, manipulable components.

The useful pattern here is a compact action–consequence loop in context: change the measure, inspect a block, choose a cohort, reveal a record. Keep the object stable enough to understand what changed. Surface the relevant definition beside the result. These are design influences, not claims that interaction alone guarantees comprehension or independent discovery.

## Data audit and limits

The snapshot has 27,598 distinct record IDs, dated 1918–2026. The chart subset is 1970–2025: 13,193 records. Excluding 2026 avoids a partial current year. The subset contains 3,092 records with unknown cause and 1,226 records unsuitable for the pooled occupant-fatality calculation because counts are missing, negative, inconsistent, or total occupancy is zero. Validity is checked separately for passenger and crew counts; ground deaths are not included in the numerator.

The separate `survivors` field is mostly null and is not used to calculate survival. The script does not assume `total_fatalities = passenger + crew fatalities`. Period comparisons remain vulnerable to changing reporting coverage and source selection. These prototypes do not certify the source as a complete safety record.

An especially consequential gap: **86.3% of all-source records in 2020–2025 have unknown cause, versus 25.2% in 1970–1979**. In the scheduled-revenue subset those figures are 87.0% and 24.4%. The recent drop in labeled technical failures cannot be interpreted independently of this classification gap. A zero count of technical labels is not proof of zero technical failures.

The World Bank WLD series has nonmissing data through 2023. Its definition is domestic takeoffs and takeoffs abroad of registered air carriers. The crash source includes private, military, training, and other populations; even a scheduled-revenue filter is not enough to prove consistent coverage. The prototype shows indexed trends, not a quotient falsely labeled crashes per million flights.

## Next design decisions supported by these experiments

- Test whether people understand a grouped dot before and after inspecting it.
- Observe whether switching shares/counts changes their interpretation of a trend.
- Check whether the conditional denominator in flight-type comparisons is understood without a presenter.
- Decide whether the matrices and profiles deserve separate views or should be inspections within one view.
- Resolve the missing exposure and duration sources before asserting real-world risk or short/long-flight effects.

These are questions for trying the prototypes, not extra gates before continuing implementation.
