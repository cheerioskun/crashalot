import { readFile, writeFile, mkdir } from 'node:fs/promises';

// Preserve upstream CSS and license headers. Only remote font imports are
// removed: this local study deliberately uses the same system font throughout.
await mkdir(new URL('../src/vendor/', import.meta.url), { recursive: true });
for (const theme of ['sandstone', 'darkly']) {
  const source = new URL(`../node_modules/bootswatch/dist/${theme}/bootstrap.css`, import.meta.url);
  const css = (await readFile(source, 'utf8')).replace(/^@import url\("https:\/\/fonts\.googleapis\.com\/[^\n]+\);\r?\n/gm, '');
  await writeFile(new URL(`../src/vendor/${theme}.css`, import.meta.url), css);
}
