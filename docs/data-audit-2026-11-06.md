# Retained story data audit — November 6, 2026

Independent numerical review of the current story payloads against the actual retained Parquet and NTSB workbook. No new dataset was fetched. The review does not independently certify every underlying accident report or establish complete archive coverage.

Reproduce with the optional retained raw files and the project's Python environment:

```sh
.venv/bin/python scripts/audit_story_data.py
```

The read-only audit imports no chart or production builder helpers. It directly selects raw Parquet records, compares exact ID sets and record fields (dates, years, aircraft, phases, source causes, normalized causes, seven named operation classifications, fatal totals and ages), independently aggregates calendar periods, and reads NTSB Table 6 cells from the retained XLSX XML using the standard library. Its assertions passed after the manufacturer-label repairs below. Raw source and workbook SHA-256 receipts also match.

## Reconciled results

| View / population | Independent result |
| --- | --- |
| NTSB U.S. Part 121 scheduled service, 2005–2024 | Every annual JSON count and departure value equals Table 6, D6:D25 / I6:I25. **9 fatal accidents / 184,082,802 departures**. |
| Worldwide exact `Scheduled Revenue Flight`, 1950–2024 | **4,328 aircraft records**, **2,208 with total fatalities > 0**. Every annual and decade aggregate reconciles. |
| Decade total counts, 1950s through 2020–2024 | **688, 704, 923, 711, 624, 365, 269, 44**. |
| Decade fatal counts, same records and bins | **402, 415, 475, 340, 304, 152, 98, 22**. |
| Scheduled records, 1970–2024 | **2,936**, including 82 ground and 62 missing-phase records. Known airborne subset **2,792** equals the comparison payload's scheduled subset by exact original source IDs. |
| Plotted airborne phases | Departure **610 (21.85%)**; in flight **655 (23.46%)**; arrival **1,527 (54.69%)**. Shares partition the same 2,792 records. |
| Phase commentary | Departure human factor **215** + technical **181** = **396 of 610**. Arrival human factor **859 of 1,527 (56.25%)**. Both claims match raw categories. |
| All-operation comparison, known airborne phases, 1970–2024 | **12,691 aircraft records**, **7,367 fatal**; excludes **393** ground/missing-phase records from the 13,084 period records. |
| Aircraft-age view | **12,293** usable-age records; **379** missing manufacture years and **19** invalid manufacture years omitted. **479** literal model labels, with no unknown/unidentified/not-recorded placeholder model labels. |

The 1970s-to-2010s total decline is **70.8559%**; the fatal-count decline is **79.3684%**. The final 2020–2024 bin covers five years and must retain its partial-period treatment.

The U.S. numerator/exposure pair is internally matched. The later worldwide archive is a different population and outcome definition. A short geographic scope cue at that transition is warranted; changing its label to worldwide or dividing the archive counts by the retained World Bank series would not resolve the mismatch. The latter has no 2024 departure value and is not a validated exposure denominator for this archive.

The coin analogy also reconciles: 184,082,802 / 9 = **20,453,644.7 departures per fatal accident**, compared with **16,777,216** possible 24-coin sequences. The claim concerns observed fatal-accident frequency per departure, not a passenger-fatality probability.

## Unexpected data and supported treatment

**Aircraft records are not deduplicated events.** All 27,598 source IDs are unique, and no 1970–2024 rows share both timestamp and registration. Distinct aircraft can belong to the same collision: Tenerife's IDs **17531 / 17532** share `1977-03-27 17:06:00+00:00`, but are different registrations `PH-BUF / N736PA`, with recorded fatalities **248 / 335** and phases takeoff / taxiing. Preserve both IDs. An audience source note can say “one record per aircraft”; deduplicating by date/location would corrupt model/phase identity and counts.

**Fatality components disagree in a small set.** For 1970–2024, **19** records have `total_fatalities` different from crew + passenger + other fatalities (missing components treated as zero for this diagnostic). **12** would incorrectly become nonfatal if the story recomputed its binary outcome from those components: IDs **15673, 15804, 16189, 16891, 17837, 17959, 19311, 22193, 24187, 24860, 25137, 25741**. Retain the consistently used source `total_fatalities > 0` definition. All period records have present, nonnegative totals. Do not substitute a broken component sum or silently repair source facts without corroboration.

**Manufacture-year validation already prevents visible nonsense.** Invalid raw values include `29`, `0`, `19567` and years after the crash date. They correctly become unusable age, rather than negative or millennia-old points. Some usable 70–88-year values belong to explicitly named vintage Travel Air, Electra, DC-3 and related aircraft; age alone is not evidence they are erroneous. Do not clip genuine old aircraft to clean up the plot.

**Manufacturer parsing had a real boundary defect.** The old “prefix plus space” rule missed **54 ATR42/ATR72 records** because the model digit immediately follows `ATR`. The reviewed digit-boundary repair and literal additional maker prefixes reduce unclassified records **577 → 176**, with the complete 12,691 ID set and 7,367 fatal count unchanged. The known-age subset has 140 remaining unclassified-maker records. These records can remain in context/scatter/model views while the generic maker choice is omitted from the audience's comparison list.

Additional literal name prefixes verified in the previous unclassified cohort: NAMC 24; Noorduyn 23; BAc 22; Fairchild-Hiller 19; Hawker Siddeley 15 and other Hawker 8; PAC 20; Max Holste 15; Raytheon 14; Transall 13; Martin 13; Casa-Nurtanio 12; GippsAero 12; Xian 12; Volpar 11; Hindustan Aeronautics 11; Piaggio 11; Beriev 11; Lisunov 10; Bristol 10; Comp Air 10; Quest 10; Aérospatiale 9; Armstrong Whitworth 8; North American 8; Howard 8; Shaanxi 8. Longest-prefix matching keeps Hawker Siddeley distinct. These are source-name labels, not inferred corporate ownership.

**“Other / not recorded” combines real missions.** Its **2,856** airborne records include Positioning 499, Agricultural spraying 369, Ferry 293, Test 216, Illegal/smuggling 200, Survey/Patrol/Reconnaissance 197, and other named missions. Only **14** have no flight type. Omitting the catch-all bar/choice for a simpler named comparison is reasonable; retaining these records in the all-types context avoids silently shrinking other linked views. It would be inaccurate to call all 2,856 unknown data.

**Age distribution spread is supported; “uniformly random” is not.** All-operation usable ages have 10th–90th percentiles **2–30 years** in 1970–1989 (n=5,833), versus **7–46 years** in 2005–2024 (n=2,960). This supports the current “more spread out” description. A crash-only archive cannot isolate an aircraft-age effect on per-flight risk or validate a worldwide maintenance-compliance claim. Keep the maintenance context separate from that inference.

## Scope of conclusion

The main counts, displayed phase shares and current decline/coin comparisons reconcile. The warranted polish is better parsing, simpler named choices and concise scope cues where populations or denominators change. No blanket deletion of unusual aircraft, wholesale unknown-cause deletion, invented exposure data, or repeated warnings in the main narrative is justified by this audit.

This independent review covers numeric payloads and their source identities, not exhaustive visual or interaction testing of every model/filter combination. Browser regression and sampled visual review are separate checks; passing the source audit does not substitute for those checks.

## Final presentation review

**Ready within reviewed scope · Complete for this bounded polish pass.** The inventory is six numerical components: the departure comparison, decade trend, linked phase/cause chapter, flight-type bars, age scatter/distribution, and model packing. Counts below describe those components, not a percentage certification of the underlying archive. The cover and opening incident were checked through existing presentation regressions, rather than re-researched as new historical evidence.

| Presentation quality | Observed defects | Assessment |
| --- | --- | --- |
| Usefulness and completeness | 0 / 6 | All six retain their intended comparison or exploration. Per-flight or manufacturer risk rankings are not inferred from archive counts. |
| Analytical clarity | 0 / 6 | U.S. scope and the worldwide handoff are explicit; the final five-year interval remains labeled. Generic categories are removed from audience choices, with retained membership explained in Source. |
| Visual and interaction consistency | 0 / 6 | Desktop/narrow, light/dark and principal linked-selection paths are sampled. Existing regression coverage checks playback, brushing, model selection, theme and overview. Not every model/filter combination is visually inspected. |

| Analytical correctness and robustness | Observed defects | Assessment |
| --- | --- | --- |
| Source authority and confidence | 0 / 6 | Payloads reconcile with retained sources and hashes. Archive coverage and original incident reports are not independently certified; the documented fatality-component inconsistencies remain a source limitation. |
| Value accuracy | 0 / 6 | Independent raw-source calculations verify headline totals, annual/decade bins, phase partitions, source identities, operation mappings and valid ages. Browser tests check grouped model counts/shares and brush memberships. |
| Within-chart agreement | 0 / 6 | Count labels, fatal subsets, denominators, area encoding and selected IDs agree in checked states. |
| Complete source details | 0 / 6 | Source drawers preserve population, record grain and controlling denominator details. Extra excluded-cause counts are moved here from the main narrative. |
| Cross-artifact consistency | 0 / 6 | Scheduled airborne IDs reconcile between phase and comparison chapters; differing U.S./worldwide populations are named rather than treated as one series. |
| Data-quality controls | 0 / 6 | Original IDs remain stable; unusable ages are excluded; manufacturer boundary/name fixes preserve every occurrence and fatal total. |
| Conclusion support | 0 / 6 | Decline, phase-share, coin and age-spread statements follow from their stated populations. Technology copy describes added protection without assigning the observed decline to a measured cause. |

The principal fixes are the ATR/name parsing repair, simpler named comparison choices, and scope/claim wording. No new exposure data, invented source corrections, or outcome-driven exclusions were introduced. The limitations above remain visible in this audit and the relevant source drawers, rather than being repeated throughout the story.
