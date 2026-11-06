# Overview navigation

Escape opens a grid containing every chapter. The fluid presentation uses full-width pages, so the stock fixed-size overview strip was replaced with a responsive grid while retaining Reveal's navigation. Explicitly showing the preview sections avoids Bootstrap's `hidden` rule suppressing all offscreen content. A landscape preview frame keeps thumbnails useful on phones, with full chapter labels available to assistive technology.

Click a preview, or focus it with Tab/arrow keys and press Enter or Space, to open that chapter at its final authored beat. The selected view returns to the top and its heading receives focus. Data selections remain intact. All chart playback is suspended during overview; Escape or Close overview without a selection restores the current beat and playback mode. A chapter selected before its async chart has mounted finishes when its chart becomes available.

Tests exercise all seven chapter destinations, opening fragments, pause/resume, keyboard selection, mobile scrolling, non-overlapping cards, and restoration of full-size layout.
