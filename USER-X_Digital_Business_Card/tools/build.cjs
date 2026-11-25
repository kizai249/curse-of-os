// Writes the static contact file (contact/*.vcf) from config/card.config.js. Run after editing the config.
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cfg = require(path.join(root, 'config/card.config.js'));
const vcard = require(path.join(root, 'src/js/vcard.js'));

if (!/^contact\/[\w.-]+\.vcf$/.test(cfg.vcfFile)) { console.error('vcfFile must look like contact/<name>.vcf'); process.exit(1); }
const out = path.join(root, cfg.vcfFile);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, vcard.build(cfg), 'utf8');
console.log('contact file →', path.relative(root, out));
const missing = ['personalPhone', 'email', 'linkedin', 'website'].filter((k) => !cfg.contact[k]);
if (missing.length) console.log('not filled yet (left out on purpose):', missing.join(', '));
if (!cfg.cardUrl) console.log('cardUrl is empty — set it after deploying, then run `npm run build` and `npm run qr` again.');
