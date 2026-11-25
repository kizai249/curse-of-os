/*
 * vCard 3.0 builder — shared by the page (fallback download) and tools/build.cjs (static .vcf).
 * Only fields that exist in card.config.js are written; empty fields are left out.
 */
(function (root) {
  'use strict';
  function esc(v) { return String(v).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1'); }
  // RFC 6350 line folding at 75 octets (UTF-8 safe: fold on characters, count bytes)
  function fold(line) {
    var out = [], cur = '', bytes = 0;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i], b = unescape(encodeURIComponent(ch)).length;
      if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0; }
      cur += ch; bytes += b;
    }
    out.push(cur);
    return out.join('\r\n ');
  }
  function build(cfg) {
    var p = cfg.person, c = cfg.contact, co = cfg.company, L = [];
    L.push('BEGIN:VCARD', 'VERSION:3.0');
    L.push('N;CHARSET=UTF-8:' + esc(p.lastEn) + ';' + esc(p.firstEn) + ';;;');
    L.push('FN;CHARSET=UTF-8:' + esc(p.nameEn));
    L.push('NICKNAME;CHARSET=UTF-8:' + esc(p.nameAr));
    L.push('ORG;CHARSET=UTF-8:' + esc(co.name));
    L.push('TITLE;CHARSET=UTF-8:' + esc(p.titleEn));
    if (c.personalPhone) L.push('TEL;TYPE=CELL,VOICE:' + c.personalPhone);
    if (c.companyPhone) { L.push('item1.TEL;TYPE=WORK,VOICE:' + c.companyPhone); L.push('item1.X-ABLabel:USER-X'); }
    if (c.email) L.push('EMAIL;TYPE=INTERNET,WORK:' + c.email);
    if (c.website) L.push('URL;TYPE=WORK:' + c.website);
    if (cfg.cardUrl) { L.push('item2.URL:' + cfg.cardUrl); L.push('item2.X-ABLabel:Digital card'); }
    if (c.linkedin) { L.push('X-SOCIALPROFILE;TYPE=linkedin:' + c.linkedin); L.push('item3.URL:' + c.linkedin); L.push('item3.X-ABLabel:LinkedIn'); }
    L.push('ADR;TYPE=WORK;CHARSET=UTF-8:;;;' + esc(co.city) + ';;;' + esc(co.country));
    L.push('NOTE;CHARSET=UTF-8:' + esc(p.nameAr + ' — ' + p.titleAr + ' · ' + co.nameAr + ' (' + co.name + '), ' + co.cityAr + '.'));
    L.push('END:VCARD');
    return L.map(fold).join('\r\n') + '\r\n';
  }
  var api = { build: build };
  root.CardVCard = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
