# Second visualization: through the decades

Requested title: **Aviation has been getting safer and safer through the decades**.

Use the retained local PlaneCrashData Parquet snapshot, revision b817a96f2b9152b735c9c6570d465102f5f76c88, SHA-256 db334ffbab0cf67b06765038803338531fbfe23522c69b453cd8eb63a6c09b48. Attribution: [MauroPello / PlaneCrashData](https://huggingface.co/datasets/MauroPello/planecrashdata), CC BY 4.0. No new dataset downloads.

## Measure and review

Filter exactly `flight_type == 'Scheduled Revenue Flight'`. Year is the first four timestamp characters. One unique source ID per counted record. All 27,598 source IDs are unique; the category contains 5,897 records across its full history. Do not infer passenger-only coverage or add separately coded Cargo and Charter/Taxi categories. Includes fatal and nonfatal outcomes, unlike the preceding U.S. fatal-accident comparison. The geography changes to worldwide; disclose that change visibly.

Ad hoc Polars query: read Parquet; exact category filter; derive year; restrict 1950–2024; group by floor(year / 10) * 10; count rows. Aggregate output and annual counts are saved in `public/data/decade-trend.json`. Annual totals and decade totals reconcile to 4,328 unique records. The archive is not a validated complete census, and changing reporting or classification may affect historical comparisons.

| Period | Years | Recorded crashes |
|---|---:|---:|
| 1950–1959 | 10 | 688 |
| 1960–1969 | 10 | 704 |
| 1970–1979 | 10 | 923 |
| 1980–1989 | 10 | 711 |
| 1990–1999 | 10 | 624 |
| 2000–2009 | 10 | 365 |
| 2010–2019 | 10 | 269 |
| 2020–2024 | 5 | 44 |

The total is 71% lower in the 2010s than the 1970s (1 − 269 / 923 = 70.86%). Counts rise initially, peak in the 1970s, and decrease in every completed subsequent decade. This does not establish a monotonic annual decline or risk per flight. The requested “safer” title is retained as narrative framing; the chart's scope line identifies the actual measured outcome.

2020–2024 is shown with an outlined, dashed bar, a separate boundary, and an explicit five-year label. Its total cannot be compared directly to the ten-year totals. Do not annualize or extrapolate it to a full decade. This archive's scheduled category ends July 24, 2025, so 2025 is excluded; the overall archive's later dates do not establish category completeness. The pandemic also complicates interpreting recent counts through exposure; no pandemic causal claim is drawn from these data.

## Current three-beat direction

1. Reveal 1950s–1970s in one sweep, ending at the peak.
2. Reveal 1980s–2010s in one sweep, with technology/training context and the 71% reduction.
3. Add 2020–2024, draw the line through the bar-top centers, and fade the bars. The 2010s-to-2020–2024 segment is dashed and ends at a hollow diamond. Keep the five-year label and comparison caveat visible.

Shared Next/Back retrace these three beats. Timing is provisional and centralized in the chart's `motion` settings. Reduced motion jumps to each endpoint. Counts retain a fixed linear 0–1,000 scale.

The header contains fixed seatbelt and reading-light pictograms. The seatbelt toggles Auto, which is now the default; the reading light toggles light/dark appearance. Active symbols glow without swapping geometry. Auto covers the opening fragments and both animated charts, with explicit Next required to move to a different slide. Music is a future direction, not implemented.

## Historical annotations

- [NTSB, Ground Proximity Warning Systems (1998)](https://www.ntsb.gov/safety/safety-studies/Documents/SR9801.pdf): FAA began requiring GPWS on large passenger aircraft in 1975.
- [NASA ASRS CALLBACK 370 (2010)](https://asrs.arc.nasa.gov/publications/callback/cb_370.html): CRM originated in a 1979 NASA workshop and addresses equipment, procedures, and people.

These support historical context. The crash-count series cannot identify how much any intervention caused the worldwide decline. Keep that limitation beside the technology annotation.

## Mechanism review

Consulted [awesome-d3](https://github.com/wbkd/awesome-d3), [Potion](https://github.com/finnfiddle/potion), and [D3 transitions](https://d3js.org/d3-transition). Potion supplies React composition; this project uses plain HTML/D3. Existing D3 axes, band/linear scales, transitions, easing, and joins cover this chart without adding a framework or a new animation engine.

## Verification

Production build and `git diff --check` pass. Browser review exercised all five beats, reverse navigation, Replay, and Pause/Resume; no browser warning/error logs were observed. Reviewed normal/narrow composition and a 1440×900 desktop layout; at 390px the plot scrolls within its own container without document-level horizontal overflow. Reduced-motion endpoint handling was reviewed in code, not independently emulated. Snapshot saved with the chat artifacts. No new datasets fetched, no publication performed.

## Bar-to-line transformation

The final beat connects the horizontal centers of the bar tops for completed decades, draws the D3 linear path from left to right, and then fades the bars. Values and scale remain fixed. The incomplete 2020–2024 bin becomes a hollow diamond, with a dashed connecting segment. Back restores the full bars; Replay resets the transformation, and Pause/Resume shares the existing transition state. Reduced motion goes directly to the endpoint. The existing D3 line generator and transition interpolation implement the transformation.

Transformation checks: production build and diff whitespace check pass. Browser verified the line draw starts while bar opacity is 1, the endpoint has line offset 0 and bar opacity 0, the partial marker remains visible, and Back restores bar opacity 1 with the line hidden. Pause/Resume was exercised during the morph.

## Playback mode

Auto is the default. The decade sequence uses 1,050 ms per reveal unit, easing each mark separately, with 280 ms after the rise/peak beat and 450 ms after the decline beat. It stops at the final line chart and requires explicit Next to change slides. Manual pauses the current reveal and cancels any pending advance. Pause/Resume, Back and Replay retain direct reader control. Leaving the slide or hiding the tab suspends work, preserving state. Reduced-motion Auto shows the final static chart immediately.

Playback verification covers natural completion, short boundary holds, stable navigation geometry, manual override, pause/resume, Back/Replay, tab visibility, slide departure, reduced motion, and the prohibition on automatic slide changes.

## Fatal-crash overlay — November 6, 2026

The yellow series counts retained records with `total_fatalities > 0`, using exactly the same worldwide Scheduled Revenue Flight category, 1950–2024 interval, source checksum and unique IDs as the total series. An ad hoc Polars aggregation reconciled all annual and decade totals before adding `fatalCount` to both JSON row sets. All 4,328 IDs are unique; no selected record has a missing or negative `total_fatalities` value. This is source-field completeness, not independent verification of every underlying accident report.

Fatal counts by bin: 402, 415, 475, 340, 304, 152, 98, 22. They sum to 2,208. Fatal crashes declined 79.37% from the 1970s to the 2010s (1 − 98/475). They are 36.43% of recorded crashes in the 2010s and 50% of records in the five-year 2020–2024 bin. Consequently the proposed “fatal ones are minuscule” copy is replaced by “Fatal crashes fell even further.” The two lines retain the same zero-based count scale and the partial-decade treatment.

## Authored fourth-slide cues — November 6, 2026

The user’s 0 / 1 / 1.5 / 2 / 2.5 / 3 / 3.5 / 4 / 4.5 / 5 / 5.5 sequence now separates all text and chart actions. Beat 0 leaves the title alone above a reserved stage. Beat 1 introduces the opening explanation; 1.5 grows 1950s–1970s bars; 2 pauses. Beat 2.5 introduces the technology heading; 3 adds its sentence and the remaining bars, including the explicitly partial 2020–2024 bin. Beat 3.5 adds the 71% decline. Beat 4 draws the total line while bars remain; 4.5 removes the bars while technology copy stays. Beat 5 introduces “These are total crashes,” with italic emphasis. Beat 5.5 draws the fatal line and shows both legend entries. The rejected historical-context sentence is removed from the main story; the source drawer retains attribution and interpretation limits.

D3 owns the existing bar, line and fade interpolation. Text changes fade as whole phrases. Auto holds are content-specific and remains slide-local; Back, Replay, Pause, visibility changes and reduced motion retain their shared transport behavior. Both series have dashed final segments and hollow partial-decade endpoints. The fatal series uses a gold/yellow tone with theme-specific contrast and exact count labels on the existing zero-based scale.

### Technology candidates reported for review, not added as new annotations

- 1975: GPWS required on large U.S. commercial aircraft. [FAA accident lessons](https://www.faa.gov/lessons_learned/transport_airplane/accidents/F-GGED).
- 1981: United introduces formal CRM training following NASA’s 1979 workshop. [FAA accident lessons](https://www.faa.gov/lessons_learned/transport_airplane/accidents/N8082U).
- 1993: TCAS II U.S. installation deadline, extended to December 30, for affected airliners with more than 30 passenger seats. [FAA historical perspective, chapter 6](https://www.faa.gov/sites/faa.gov/files/about/history/historical_perspective/historical_perspective_ch6.pdf).
- 1994: Predictive windshear systems enter commercial service. [FAA accident lessons](https://www.faa.gov/lessons_learned/transport_airplane/accidents/N726DA).
- 1996: Honeywell introduces enhanced GPWS with forward-looking terrain alerts. [Honeywell technology history](https://www.honeywellaerospace.com/us/en/insights/articles/five-times-honeywell-was-first-in-safety-innovation).

Dates refer to specified introductions or U.S. requirements, not universal worldwide fleet adoption. The user asked to review candidates first; no new chart annotations have been added.

### Bridge into the phase story

After the fatal-crash comparison, one explicit Next opens Beat 6: “What factors affect these numbers?” / “The phase of flight is one place to start.” Both completed lines and the legend remain visible. Auto stops at Beat 5.5 and never opens the bridge or changes slides. A second Next enters the Sankey. Back returns to the fatal comparison with its complete plotted values. Reduced-motion Auto likewise stops at the fatal comparison.

## November 6 polish audit

The visible headline now describes fewer recorded crashes since the 1970s peak rather than treating counts as a per-flight safety trend. The preceding U.S. comparison explicitly asks for the longer worldwide picture. Technology copy describes added protection without attributing the measured decline to those interventions. Each archive record describes one aircraft; a multi-aircraft collision can contribute multiple records, so these totals are not deduplicated event counts. The five-year final interval remains visibly marked. Independent raw-source calculations are recorded in `data-audit-2026-11-06.md`.
