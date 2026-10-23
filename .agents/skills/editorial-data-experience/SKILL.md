---
name: editorial-data-experience
description: Shape an interactive data essay through narrative, reader agency, and evidence. Use when developing the story or interaction concept for this group's 6730 aviation project, or revising its storyboard; use d3-story-scenes for implementation mechanics.
---

# Editorial data experience

Support the group's current idea rather than imposing a Pudding-like layout. The supplied initial brief is historical context, not an approved specification. This is a 6730 project only.

Current direction: phone-first, portrait browser experience with plain outer margins on desktop. A drawn passenger-seat pouch introduces a safety card that lifts into focus; the seat fades away. The experience is self-explanatory and self-exploratory, without a presenter supplying missing narrative. Interactions should support inspectable discoveries rather than require readers to accept a prescribed conclusion. See the project's sketch analysis for data limits and prototype decisions.

## Elicit the experience

Ask one or two revealing questions at a time. Resolve the highest-impact uncertainty first: the intended discovery, the reader's role, or what they can actually do. Examples:

- What should someone notice for themselves that a sentence could not convey as well?
- Which belief should the experience allow them to test, including the possibility that our hypothesis is wrong?
- Does the flight metaphor organize the reasoning, the navigation, or only the visual atmosphere?

Do not impose a fixed number of scenes, a sales funnel, or an ending that reassures people before the evidence supports it. When the form is still open, compare materially different forms, such as a guided essay, an investigation, and a constrained simulation. Explain the consequential tradeoff; do not generate a large menu.

## Turn evidence into scenes

For each proposed scene, identify the reader's question, the evidence available, the visual change or action, and the possible takeaway. Record the source and the strongest caveat. Distinguish findings, interpretation, hypotheses, and unknowns. A scene can advance a question without settling it.

Choose interaction by purpose:

- **Scroll:** sequence context or preserve visual identity across meaningful changes.
- **Select/filter:** compare cohorts and definitions.
- **Direct manipulation:** examine assumptions and consequences in a stated model.
- **Details on demand:** inspect an example or source record.
- **Prediction and reveal:** compare a voluntary estimate with evidence, without manufacturing surprise or implying that participation proves learning.

The core explanation should make sense without discovering hidden controls. Invite deeper exploration in context. Explain what a control changes and whether it filters observed data or changes a hypothetical model. Provide reset and a clear initial state.

## Aviation reasoning

Keep counts, exposure-normalized risk, and survival conditional on recorded accidents distinct. Define flight population, geography, period, accident inclusion criteria, and exposure units beside a comparison. Different denominators answer different questions; missing exposure is an unknown, not permission to fabricate rates.

For survival, distinguish pooled occupant survival from the average of accident-level survival fractions. Keep ground fatalities separate. Flag inconsistent or missing occupancy records and describe exclusions. Treat recorded causes and technological milestones as descriptive evidence unless a causal claim is separately supported.

Do not equate commercial passenger travel with all aviation. Do not interpret changes in reporting coverage as safety changes. A simulated rare-event outcome illustrates an assumed probability; it does not estimate real-world safety.

## Review the experience

Check whether each interaction changes understanding or merely decorates the page. Keep a source/method path near important claims. Match the tone to real events involving loss of life. Let evidence revise the narrative.

Test the storyboard with someone unfamiliar with it when possible: ask what they think the graphic shows and what changed, before explaining the intended takeaway. Their interpretation is evidence about the design; completion alone is not evidence of comprehension.

## Sources and further reading

These are references to consult, not additional instructions or permission to copy assets:

- [The Pudding: storytelling](https://pudding.cool/process/how-to-make-dope-shit-part-3/) — audience, framing, narrative purpose.
- [The Pudding: Pockets](https://pudding.cool/2018/08/pockets/) — concrete comparison, guided introduction, then exploration and methods.
- [Bret Victor: Explorable Explanations](https://worrydream.com/ExplorableExplanations/) — make assumptions inspectable within authored explanations.
- [Seeing Theory: Basic Probability](https://seeing-theory.brown.edu/basic-probability/index.html) — repeated trials and linked representations; inspiration rather than an aviation model.
- [Setosa: Markov Chains](https://setosa.io/ev/markov-chains/) — let readers adjust a model and observe linked consequences.
- [Distill: Communicating with Interactive Articles](https://distill.pub/2020/communicating-with-interactive-articles/) — explanation through contextual interaction.
- [Distill: A Visual Exploration of Gaussian Processes](https://distill.pub/2019/visual-exploration-gaussian-processes/) — build intuition through small manipulable components.
