# Safety trend: source and measurement decision

This is a verified data specimen for the component showcase. It does **not** settle the final presentation's geographic or operational population.

## What can be shown now

**U.S. air-carrier fatal accidents per million departures, 2005–2024.**

The population is U.S. air carriers operating under **14 CFR Part 121**, both scheduled and nonscheduled service, including passenger and cargo operations. U.S. operators can have accidents outside the United States. These are not all flights in U.S. airspace, and this is not a global passenger-only series.

Use these chart labels:

- Measure: **Fatal accidents per million departures**.
- Count view: **Fatal accidents**.
- Exposure: **Departures**.
- Scope line: **U.S. air carriers · passenger and cargo · 2005–2024**.
- Short source credit: **NTSB; departure exposure compiled by the FAA**.

The definition includes fatal injuries on the ground. An aircraft need not be destroyed, and passengers need not be killed, for an event to be a fatal accident. Therefore “fatal crashes” and “passenger fatality probability” are not interchangeable labels.

## Authoritative source

[NTSB U.S. Civil Aviation Accident Statistics landing page](https://www.ntsb.gov/safety/Pages/research.aspx), updated April 21, 2026, accessed October 24, 2026.

[Original 2005–2024 NTSB workbook](https://www.ntsb.gov/safety/Documents/AviationAccidentStatistics_2005-2024_20260112.xlsx). The original is retained at `data/reference/ntsb-aviation-statistics-2005-2024.xlsx`, with its SHA-256 stored in the prepared JSON.

Relevant sheets:

- **Table 5, A6:O25:** annual accidents, fatal accidents, and matching flight exposure for Part 121 scheduled and nonscheduled operations. Column D is fatal accidents; I is departures; O is published fatal accidents per 100,000 departures.
- **Table 29:** accident aircraft. This permits a check that fatal-event counts do not undercount eligible aircraft involved in a collision.
- **Table 12:** intentional acts. No scheduled Part 121 intentional acts are listed during this window. Every rate independently computed from Table 5 counts and departures matches the source's annual rate.

NTSB's general rule includes intentional acts in accident counts but excludes them from rate computation. The source's annual rate reconciliation is important; do not assume that a future edition, longer time range, or different population will maintain this equivalence.

## Recorded computation and validation

These outputs were prepared and validated earlier in the conversation:

- `public/data/safety-trend.json`: metadata, 20 annual rows, and aggregate totals.
- `data/reference/ntsb-part121-fatal-aircraft-audit.json`: the 17 relevant aircraft records for inspection.

The assistant-authored extraction/inspection script was subsequently deleted at the user's request. The source workbook and saved outputs remain available; this document records the checks already performed, not an executable reproduction workflow. Further inspection should use ad hoc queries over existing project data, with no new downloads.

The calculation is `fatalAccidents / departures × 1,000,000`. No rounded published rates are inverted to manufacture exposure counts.

The earlier extraction verified:

- Exactly one row per year, 2005–2024, with no gaps or interpolation.
- Positive integer departure counts and nonnegative integer fatal-accident counts.
- Every annual rate matches NTSB's unrounded spreadsheet rate multiplied by 10, within numeric tolerance.
- There are 17 fatal events. Each has exactly one eligible Part 121 aircraft in Table 29, including a check of **all** Part 121 aircraft sharing the fatal-event ID. No two-eligible-aircraft fatal collision adjustment is needed in this window.
- Those aircraft counts agree with every annual fatal-accident count in Table 5.
- Total exposure is 187,608,748 departures. The pooled rate is 0.0906141 fatal accidents per million departures. It is computed from summed counts and exposure, not an unweighted mean of annual rates.
- Ten years have zero observed fatal accidents. That is an observation, not proof of zero underlying risk.

The series fluctuates. Its first year has 3 fatal accidents in 11,130,407 departures, or 0.2695319 per million. Its last year has zero in 9,274,699 departures. A claim of uninterrupted annual improvement is unsupported. 2025 accidents are outside this source window and must not be omitted silently from language such as “today” or “current risk.”

## Why the exact safe-flight percentage remains unset

The user's chosen concept is a flight without a fatal accident. The mathematical complement of the published operational rate is:

`rateComplementPercent = 100 × (1 - fatalAccidents / departures)`.

That value is provided as a derived field, but **`safePercent` is deliberately null**, and metadata has `safeShareIdentified: false`.

NTSB supplies accident events and departure exposure, rather than a census of completed journeys linked to outcomes. For example, the 2022 fatal event is a ground-handling accident with the aircraft standing. Matching the operational cohort and resolving collision multiplicity do not by themselves establish a literal percentage of completed flights that were safe. The event-rate complement should not be relabelled an exact safe-flight share without a further definition/source decision.

The component specimen should therefore use the verified **rate and count views only**. The later 100% narrative reveal remains an open measurement decision, not a rejected design idea.

## Sources considered and not combined

- [IATA 2025 safety report](https://www.iata.org/en/publications/safety-report/) offers global commercial scope, including jet and turboprop operations, but its **fatality risk** measure is not the fatal-accident frequency. Historical data can be revised; mixing editions without reconciliation is unsafe.
- [Airbus 2025 traffic and accident explanation](https://accidentstats.airbus.com/traffic-and-accidents-in-2025/) explicitly excludes the 2025 Air India B787 crash from its statistical analysis while its cause is unclassified. That makes the current series unsuitable for an unqualified “all flights without fatal accidents” claim.
- Existing crash archive counts were not divided by World Bank departures. The populations and reporting coverage are not established as compatible.

This source choice prioritizes an inspectable, matched numerator and denominator over a broader but misleading claim.
