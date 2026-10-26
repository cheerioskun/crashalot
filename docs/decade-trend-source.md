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

The header replaces Appearance with a sun/moon theme button and a neighboring icon for Manual/Auto. Playback remains scoped to the trend visualization; other scenes do not yet implement automatic playback. Manual is the default. Music is a future direction, not implemented.

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

A compact Manual/Auto icon in the shared header defaults to Manual. Auto waits two seconds after a beat's animation completes, then advances within this chart through the line transformation; it stops at the final beat. Selecting Manual cancels the pending advance without interrupting a running reveal. Pause cancels both animation and any pending advance; Resume continues Auto. Back pauses Auto to let the previous beat remain inspectable; Replay restarts in the selected mode. Leaving the slide cancels playback and pending timers. Reduced motion still retains the two-second dwell between automatic beats.

Playback verification: production build and whitespace checks pass. Browser review observed automatic progression from the first beat through the final transformation, Pause holding the current beat, Resume restarting playback, and switching to Manual clearing the pending two-second advance.
