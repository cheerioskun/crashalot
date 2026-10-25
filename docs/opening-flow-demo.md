# Opening flow demo

October 25, 2026. Reviewable narrative proposal, not a final script.

The cover opens a click-controlled Flight 1282 story. The first sentence pauses at its comma, then continues without becoming a new headline. The next click introduces a photograph, followed by the safe landing outcome. A final beat replaces the event description with a personal question and an invitation to inspect historical counts.

The comparison then waits for explicit actions: count 2005 fatal accidents, count 2005 departures, and move through subsequent years. The second clause of its headline appears as departures begin. Built-in Reveal fragments and CSS transitions handle the story; the existing D3 frame clock handles the graph. Reduced motion skips each animated count stage to its endpoint, retaining the sequence.

## Factual boundaries

- Flight 1282: January 5, 2024, about six minutes after takeoff. The door plug separated; the aircraft returned to Portland. No fatalities; one flight attendant and seven passengers sustained minor injuries.
- Reference: [NTSB press release](https://www.ntsb.gov/news/press-releases/Pages/NR20250624.aspx) and [AIR-25-04](https://www.ntsb.gov/investigations/AccidentReports/Reports/AIR2504.pdf).
- `public/assets/flight-1282-cabin.jpg` is Figure 1 extracted from report page 7 (PDF page 21). Original seat labels are retained. This is an authentic photograph, not a generated reconstruction.
- This nonfatal event is not part of the fatal-accident numerator. The graph changes to U.S. Part 121 scheduled-service data for 2005–2024. See [scheduled-service-source.md](scheduled-service-source.md); a revenue-only filter remains unverified.
- This comparison addresses fatal accidents per departure. It does not answer the probability of an incident like the opening event, or establish that nonfatal incidents are harmless.

## Review questions

Does the photograph leave enough room to absorb the outcome? Does the question invite curiosity without prescribing reassurance? Does the move from a 2024 nonfatal event to historical fatal accidents feel sufficiently explicit? The remaining slides retain their earlier draft narrative and broader cohort; they are outside this opening demo.
