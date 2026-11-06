# Footer beat timing

The divider above the presentation footer doubles as a quiet left-to-right wick. It reads the same controller state and timeout deadline that actually schedule the next beat; it does not run an independent decorative countdown or alter authored timings.

- **Next in …s:** current reveal time plus its following reading hold, or the remaining hold alone. The wick carries smoothly from animation into the hold. Each new beat starts a fresh wick.
- **Revealing · …s:** the current motion will finish, but it will not automatically open another beat. This includes the final coin comparison and the conclusion's farewell/EXIT transitions.
- **Paused:** the wick freezes while the current reveal or hold is paused. Resuming Auto re-arms the authored hold, matching existing playback behavior; motion resumes from its retained progress.
- **Next when ready →:** a settled line and a permanent prompt at an explicit-Next boundary. There is no fabricated countdown while waiting for a click.
- **Next to begin:** the opening page. No timer is shown because the viewer owns departure.

The existing Next button retains its label and dimensions. On narrow screens, the small timing caption sits below the slide/reveal position. The wick exposes progress and remaining-time text to assistive technology without announcing every animation frame. Overview and hidden tabs suppress it. Reduced motion uses the existing static final scenes and clear Next prompts.

Timing metadata is supplied by the opening, scale comparison, decade trend, phase/cause chapter, comparison chapters and conclusion. The scale comparison's timed narration can advance while its background year count continues; the footer follows the narration deadline, then waits for the final coins/year accumulation before prompting for Next.
