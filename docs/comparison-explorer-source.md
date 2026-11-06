# Flight-type and aircraft comparison prototype

November 6, 2026. These chapters replace all three former placeholder slides. The narrative explores whether perceptions transfer across different operations, then asks whether aircraft/model/age differences matter. The archive alone does not establish a per-flight risk ordering, a manufacturer safety ranking, or a measured effect on public perception.

## Retained source and scope

`public/data/comparison-records.json` projects the existing PlaneCrashData snapshot, revision and SHA-256 from `data/sources.json`. `scripts/build_comparison_records.py` reads that retained file only, checks its checksum, preserves original string IDs, and supports `--check`. No new data download or production-count-to-flight-exposure substitution is used.

Scope: worldwide, 1970–2024, known airborne phase (departure, in flight, arrival), using the same phase mapping as the Sankey. There are 12,691 distinct aircraft-occurrence records across operations; 393 ground/unresolved-phase records are excluded. Scheduled Revenue Flight contributes the same 2,792 IDs as the preceding Sankey. Other source flight-type labels remain in Other / not recorded rather than being silently removed or merged into scheduled revenue.

Aircraft age is calendar year of crash minus recorded manufacture year. Values missing or outside `1903 <= manufacture year <= crash year` are unusable. The user requested that these be skipped in the scatterplot and its linked breakdown: 398 records across the full comparison cohort. Flight-type counts retain them. Calendar-year age is approximate, not exact aircraft service time.

Manufacturer labels are explicit literal prefixes of the aircraft-name string, matched longest-first. They are not a manufacturer source field or a corporate ownership history. Recognized source names remain separate (for example, Douglas is not reassigned to Boeing); 577 unmatched names remain Unclassified name. Raw aircraft strings and manufacture years remain inspectable. The aircraft-production dataset has no direct manufacturer join and its production counts are not flight exposure, so it is not joined into a risk calculation.

## Selection contract

A shared year interval (inclusive start, exclusive end) and flight-type choice carry between the two chapters. The aircraft scatter plots one mark per usable-age source record at crash date × age. Horizontal D3 brushing snaps to calendar years; numeric year controls supply a keyboard alternative. Unknown ages are excluded from both the scatter and its linked selection views.

All aircraft-linked manufacturer/model cells and record details are derived from selected original IDs, never from display labels or point array indices. A manufacturer choice narrows the highlighted scatter records and model/record views. Manufacturer bars retain the date/type context for comparison. The flight-type chapter retains age-unknown records and states that broader scope in source details; a shared time window is not a claim that its age-independent count equals the aircraft-only subset.

## Fatal-outcome emphasis

Every flight-type, manufacturer and model bar uses a shared zero baseline for the solid fatal segment (`fatalities > 0`), followed by the pale nonfatal remainder. The two segments sum to the original total; the archive's source IDs are retained in both total and fatal membership. Direct labels emphasize fatal counts, with hover and keyboard-focus tooltips disclosing fatal, nonfatal and total counts. These are counts, not risk rates.

## Brush-edge age distribution and cohort guide

The horizontal selection carries a right-edge age histogram facing outward. A reserved plot gutter keeps the full-range distribution inside the SVG. Five-year bins cover the full valid-age domain, sharing the scatterplot's vertical age scale. Bin memberships partition the exact selected source IDs, including the manufacturer filter; no record is counted twice. Each bin uses the same fatal/nonfatal segmentation as the comparison bars. Width is normalized to the largest bin in the current selection, labeled above the histogram; it is not a probability or an exposure-adjusted age-risk curve. The right baseline follows the inclusive calendar selection's exclusive end boundary. Full-range selection pins the histogram to the plot’s right edge. During dragging its baseline follows the live brush edge, and updates from fields or filters ease over 180 ms. Clicking outside the selection clears the year brush. Fatal segments use the historical chapter’s yellow/gold palette in both themes.

The annotated diagonal follows a single recorded manufacture year. Choose a well-populated pre-1950 build year spanning at least 15 event years when available, otherwise the most represented qualifying build year. Its slope follows the identity `age = event year - manufacture year`; it is not evidence that age causes crashes, that these are repeated observations of one aircraft, or that older aircraft are safer. The labels and membership are recalculated for the active flight type and manufacturer context.

## Guided reveals and maintenance context

Flight types have four cues: the opening question; scheduled-service bars; the other operations; then free comparison. Aircraft have five: the age frame; records reveal chronologically; the actual build-year diagonal fades in; an aging-aircraft maintenance explanation; then the histogram and linked manufacturer/model exploration. Auto runs within each chapter and stops at the final cue. Next settles an unfinished animation before advancing. Back rewinds, Replay starts again, Pause/Resume and document/slide visibility suspend the current reveal. Reduced-motion mode exposes a static final view. Any deliberate field, bar or brush interaction opens exploration immediately and holds Auto.

The maintenance explanation is explicitly U.S. context: FAA AC 120-84, Aging Aircraft Inspections and Records Reviews (active guidance, change 1), and 49 U.S.C. § 44717, accessed November 6, 2026. These describe inspections, records reviews and adequate, timely maintenance of age-sensitive parts for covered air-carrier operations. They do not establish worldwide compliance or quantify the contribution of age to crash probability. The archive contains crash records only; fleet age and flight exposure by age are missing, so the story does not claim that age is negligible as a risk factor.

- FAA: https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_120-84_CHG_1.pdf
- U.S. Code: https://uscode.house.gov/us/usc/119-120/t49/s44717/
