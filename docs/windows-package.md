# Browser-only Windows package

The recipient right-clicks `crashalot-windows.zip`, chooses **Extract All**, opens the extracted `crashalot` folder, and double-clicks **START.html**. Choose Microsoft Edge or Chrome if Windows asks. No installation, internet access, command line, or local server is needed. Use an up-to-date browser. The package also works in Chrome on macOS and Linux.

`START.html` contains the presentation, JavaScript libraries, both themes, the four chart JSONs actually loaded by the story, photographs, and available aircraft schematics. It can be moved or sent on its own. A brief loading screen covers initialization; there is no CDN download. Source and credit links need the internet only when opened deliberately.

The ZIP also includes editable source, the runtime JSONs and image files, a dependency lockfile, license notices for the bundled libraries, and a manifest with SHA-256 hashes. It excludes `node_modules`, old unused chart JSONs, retained raw datasets, giant manufacturer PDFs, caches, and Git history. Existing source credits remain visible; bundling public schematic previews does not create a new license to those images.

## Build and verify

On the developer's machine, with this repository's Node dependencies already installed:

```sh
node scripts/package-portable.mjs
node scripts/test-portable.mjs
```

The result is `exports/crashalot-windows.zip` and an unpacked `exports/crashalot/` preview. `exports/` is ignored by Git. To use another output folder, pass `--out=/absolute/path` to both commands. The builder uses Vite's existing installed dependency; it needs no extra packaging package or system ZIP utility. It writes an ordinary DEFLATE ZIP supported by Windows Explorer.

The verifier opens the file directly with Playwright's Chrome channel, with internet disabled. It checks all seven chapters, loaded chart cohorts, model selection and image decoding, theme switching, and overview navigation. It also copies just `START.html` to a different path containing spaces and opens that copy to ensure there is no sibling-file dependency. This checks browser `file://` restrictions without using a development server. An actual Windows laptop smoke test is still useful; development verification runs on the current host, not Windows.

## Why a separate export?

The normal Vite `dist/index.html` uses ES modules, separate chunks, and JSON requests. Opening it through `file://` does not provide a reliable origin for module or fetch loading. The portable build compiles one classic script and puts the runtime data in memory. Its fetch adapter serves only the exact bundled JSON paths; ordinary fetch behavior remains available for other paths. Source-data downloads use browser Blob URLs. CSS, themes and images use inline or data URLs.

The editable source remains a normal Vite project, with its tests and data-builder rules. A developer can run `npm ci` and `npm run dev` from `source/`, or rebuild the portable package with the commands above. Only the main seven-slide presentation is packaged; the historical `components.html` study remains in source, but its unused chart JSONs are deliberately omitted. Rebuilding the numeric datasets from their original snapshots is a separate development task: those raw datasets are deliberately not included. Use the checked-in JSONs to view or rebuild the presentation unchanged.

Rebuild the package after changing story code, data, assets, or libraries. The generated HTML is an export, not the file to edit.
