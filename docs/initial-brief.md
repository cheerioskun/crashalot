# Initial brief — historical context

This records the supplied proposal and hand-drawn narrative sketch. The user explicitly identified these as the **initial, not current**, state. Ideas and claims here are starting points to revisit, not requirements or verified findings.

## Scope and audience

The project is for 6730 only. The initial proposal focuses on the general U.S. flying public, with relatively little aviation knowledge and moderate visualization literacy. The intended output is an interactive website experience.

## Initial questions

- How have accident frequency, fatalities, and survival changed over roughly a century?
- How do aircraft type, flight type, route, duration, and accident causes relate to those patterns?
- How did safety practices and technology evolve?
- How can aviation risk be put in perspective, including comparisons with other transport?

## Initial narrative sketch

The sketch suggests structuring the experience as a commercial flight: begin with perceptions and fear, move through the history of safety improvements and remaining failure modes, and end with a broader perspective on rare events and risk. Relieving fear and debunking outdated beliefs were early aspirations.

Claims in the sketch about falling accident counts, human factors dominating causes, or catastrophic failure modes being conquered need evidence and careful definitions. The current narrative should be elicited before committing to this arc.

## Proposed data and known limitations

The proposal names a Hugging Face plane-crash dataset as the primary source, with possible supplementary aircraft production, historical flight activity/ACARS, and road-accident data. Exact dataset URLs, versions, licenses, coverage, and provenance remain to be established.

The proposal reports inconsistent records, including fatalities exceeding recorded occupants. Fatalities outside an aircraft must be distinguished from passenger and crew fatalities.

Accident records alone cannot establish the probability of an accident per flight. Comparisons across periods, aircraft, or transport modes require appropriate exposure denominators and compatible coverage. Survival among recorded accidents is a different quantity from overall flight safety. Aircraft production is not a direct substitute for flight exposure.

## Current decisions

- Public GitHub repository: `crashalot`.
- Toolchain may use `uv` and `npm`.
- Start with a minimal repository; develop the current experience through discussion.
