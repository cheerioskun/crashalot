---
name: d3-story-scenes
description: Implement and verify responsive charts, linked interactions, and reversible scroll scenes for the 6730 aviation website using D3 or Observable Plot. Use for chart and scene mechanics after the reader question is defined, not for choosing the narrative or mandating a site framework.
---

# D3 story scenes

Choose the simplest renderer that supports the intended interaction. Observable examples are references; using them does not require Observable hosting or its notebook runtime.

## Choose the tool by behavior

- Use Observable Plot for ordinary statistical views and rapid comparison of encodings when declarative marks and rerendering suffice.
- Use D3 for custom layouts, brushing/zooming, and transitions that preserve the identity of marks between scenes. A page can use both without each graphic sharing a renderer.
- Start with SVG/HTML for moderate mark counts and accessible labels. Use Canvas when measured rendering cost justifies it, with a separate semantic explanation and selection details.

Check current official APIs before adapting old examples. Legacy bl.ocks examples may use obsolete D3 APIs and event signatures. Inspect their source/version/license rather than copying a remote script tag into production. Check license and attribution for each reused example or asset.

## State and rendering

Represent the current scene, cohort/filter selection, and selected record explicitly. Derive a complete view from that state. A scene must render correctly when reached directly, reached in reverse, restored after resizing, or entered after skipping several steps. Do not depend on a chain of previous animations executing.

Use stable record keys for D3 joins when preserving identity. Explain changes in aggregation: a dot representing an accident cannot silently become a passenger. Keep comparison scales stable where meaningful; label deliberate changes in units, scale, population, or time coverage.

If using a UI framework, give each DOM subtree one owner. For Plot, recreating the plot on data/state changes is a supported approach; clean up the previous node and listeners. For D3, interrupt obsolete transitions on rapid navigation and remove listeners/observers on teardown.

## Scroll mechanics

Use ordinary document scrolling. For pinned graphics, use CSS `position: sticky` within a bounded section. Use IntersectionObserver or Scrollama for step detection; use progress callbacks only when continuous change explains something.

Make scene selection independent from animation progress. Provide the same final information with reduced motion, using immediate state changes or stacked snapshots. Do not trap wheel/touch events to force a reading pace.

Size charts from their actual container, for example with ResizeObserver. On mobile, decide whether a sticky view still leaves enough reading space or whether stacked charts explain the sequence better. Account for browser chrome when choosing stable versus dynamic viewport units; old tutorials predate `svh` and `dvh`.

## Interaction and accessibility

Give hover details a touch and keyboard equivalent. Important conclusions and caveats must remain visible without hover. Prefer labeled native controls for filtering; brushing can have an equivalent range input when precise selection matters. Show active filters and offer reset. Do not encode a distinction with color alone.

Put metric, unit, population, and source in readable chart context. Include a concise textual interpretation and an accessible route to the underlying values when needed. Mark missing data explicitly and preserve gaps rather than treating missing values as zero.

## Verify behavior

Use browser evidence for the implemented interaction, not just build success. Check forward/reverse scrolling, fast jumps, direct section entry, resizing, a narrow touch viewport, keyboard operation, and reduced motion as relevant. Check console errors and whether labels or controls collide. Compare displayed aggregates with independently computed source totals and test meaningful edge cases such as an empty filter.

Stop once the intended behavior and material risks are checked; do not add a large test suite that merely duplicates chart code.

## Official references

- [D3 gallery](https://observablehq.com/@d3/gallery) — find an interaction or encoding example; inspect its source before adapting.
- [D3 joining data](https://d3js.org/d3-selection/joining) — keyed identity, enter/update/exit.
- [Observable Plot interactions](https://observablehq.github.io/plot/features/interactions) — pointer details, inputs, and rerendering constraints.
- [Scrollama](https://github.com/russellsamora/scrollama) — step/progress callbacks and lifecycle.
- [The Pudding: sticky graphics](https://pudding.cool/process/scrollytelling-sticky/) — CSS owns pinning; JavaScript owns state triggers.
- [The Pudding: responsive scrollytelling](https://pudding.cool/process/responsive-scrollytelling/) — semantic mobile choices; verify its older browser guidance against current documentation.
- [MDN: length units](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/length) — viewport sizing behavior.
