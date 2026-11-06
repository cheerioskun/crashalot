# Slide timing

The footer divider is one translucent wick for the slide's beat sequence. Its total is the sum of the authored reveal durations and reading holds. The same live clock that drives playback positions the wick inside that total; new beats continue it rather than resetting it.

- **Slide · …s left:** time remaining across the current and subsequent beats. Motion and reading holds both count. In the scale comparison, year accumulation overlaps the commentary, so only its remaining tail is added at the coin beat.
- **Paused:** the wick freezes. Resuming continues both motion and the remainder of a reading hold from that position. Back moves it to the corresponding earlier point; Replay starts the slide over.
- **Next when ready →:** Auto has reached the slide's explicit-Next boundary. The settled line and persistent label make the wait intentional. Manual navigation also uses this label when another click is needed.
- **Next to begin:** the opening page; the viewer owns departure.

The line is 48% opaque while moving, softer when paused or finished. The small caption is 70% opaque. The Next button keeps its fixed label and dimensions. Overview and hidden tabs suppress the timer. Reduced motion settles to the existing final scenes.

The conclusion pauses its timeline at the farewell and displays “Next when ready.” An explicit Next opens the handwritten end card and fills the remaining portion of the same wick. Its writing uses the same pause/seek clock. The footer disappears when the writing completes. No timer advances the presentation to another slide.

Each view supplies its authored duration/hold timeline to the shared playback controller. Tests cover continuous progress across boundaries, remaining reading holds after pause, overlapping scale animation, Back, reduced motion, and overview.
