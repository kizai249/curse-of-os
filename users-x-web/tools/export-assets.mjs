// Regenerates the static SVG files from the single pixel sources used by the site:
//   assets/logo/symbol.js   → assets/logo/usersx-symbol.svg
//   assets/avatar/nuqta.js  → assets/avatar/nuqta.svg
// Run: node users-x-web/tools/export-assets.mjs
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const symbol = require(join(root, 'assets/logo/symbol.js'));
const avatar = require(join(root, 'assets/avatar/nuqta.js'));

const files = {
  'assets/logo/usersx-symbol.svg': symbol.svg({ title: 'USERS-X' }),
  'assets/avatar/nuqta.svg': avatar.svg({ title: 'نقطة — دليل يوزرز إكس', still: true })
};
for (const [file, svg] of Object.entries(files)) {
  writeFileSync(join(root, file), svg + '\n');
  console.log('wrote', file, svg.length, 'bytes');
}
