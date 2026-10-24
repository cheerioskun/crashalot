# Opening comparison: scheduled service

The opening comparison now uses the retained NTSB workbook, Table 6 (scheduled service), rather than Table 5 (scheduled and nonscheduled combined). Source file: `data/reference/ntsb-aviation-statistics-2005-2024.xlsx`. Prepared chart data: `public/data/scheduled-service.json`.

Extracted A6:O25 with ad hoc Python standard-library XML reads, without another download or a new inspection script. Column D supplies fatal accidents; I supplies departures. Verified 20 consecutive years (2005–2024), exact integer totals, and every annual D/I × 100,000 against column O.

The user's desired population is scheduled revenue flights. Table 6 establishes scheduled service but does not separately verify revenue-only operations. Do not describe the cohort as verified revenue-only, worldwide, or passenger-only. Fatal accidents include ground fatalities. The on-slide copy is intentionally minimal; source and definition remain in this note and chart metadata. Later slides retain their existing cohorts pending iteration.

## Motion

Use one D3 timer for continuous bar geometry and scale. Round only the numeric readouts. Quintic smoothstep gives zero velocity and acceleration at the ends; the shared scale expands with a smooth magnitude function. Axis ticks maintain numeric identity, move with the same scale, and fade when tick density changes. Cache layout during resize instead of measuring on each frame. Preserve pause/resume, replay, and reduced motion.

References consulted: [D3 axis](https://d3js.org/d3-axis), [D3 transitions](https://d3js.org/d3-transition), [Material motion](https://m3.material.io/styles/motion), [duration and easing](https://m1.material.io/motion/duration-easing.html). Quantitative marks must not overshoot their actual totals.

## Progressive interval

The comparison begins with 2005 alone: 3 fatal accidents and 10,910,460 departures. The original two-second accident rise and seven-second departure rise apply to this first year. The complete first-year comparison holds for 1.5 seconds. Then each subsequent source year is added cumulatively over 650 ms, reaching 2005–2024: 9 fatal accidents and 184,082,802 departures. The prominent date displays the year currently being added. Pause/resume and replay cover the full sequence.

One d3-svg-annotation callout appears after the first-year impact, anchored to the actual subpixel bar endpoint and updated with the cumulative count. It does not enlarge the bar. Source notes remain outside the minimal slide UI. The annotation package's transitive d3-color is overridden to ^3.1.0; npm audit reports no vulnerabilities.

## Rolling number polish

NumberFlow's vanilla web component (`number-flow`, MIT; https://number-flow.barvian.me/vanilla) now renders the accident count, departure count, and growing interval end year. Its continuous plugin rolls digits upward. Count updates are paced to 80 ms with 140 ms spin timing, while bars retain the frame-driven continuous D3 geometry. Year updates use 300 ms spins within each 650 ms year addition. The component respects reduced motion, resets directly on replay, and settles to exact integer totals. The redundant sentence beneath the chart is removed; the anchored annotation explains the subpixel accident bar.

The fatal-accident series now uses the theme's danger red; departure bars retain series 2. Each rolling counter inherits precisely its bar's CSS color, and the callout follows the accident red. After the first-year impact, “Now let’s move through the years.” fades in and lifts into place over 600 ms during the existing 1.5-second hold, before cumulative expansion begins. Pause/replay stay above this line.
