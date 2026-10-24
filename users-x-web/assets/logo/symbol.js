/*
 * USERS-X · D-PAD X symbol
 * Exact 15×15 pixel grid sampled from the official symbol in
 * "USERS-X Brand Presentation 2026", page 7 (نظام الشعار — الرمز).
 *   W = Bone White #F4F4F1   D = shade #33354C (arrow notch)   M = Pulse Magenta #F54BF7
 * Never rotate this grid by 45° (brand rule: it turns into "+").
 * Used by script.js (interactive logo + intro assembly) and tools/export-assets.mjs.
 */
(function (root) {
  'use strict';

  var GRID = [
    'WWW.........WWW',
    'WWWW.......WWWW',
    'WWDDW.....WDDWW',
    '.WDWWW...WWWDW.',
    '..WWWWW.WWWWW..',
    '...WWWWWWWWW...',
    '....WWWMWWW....',
    '.....WMMMW.....',
    '....WWWMWWW....',
    '...WWWWWWWWW...',
    '..WWWWW.WWWWW..',
    '.WDWWW...WWWDW.',
    'WWDDW.....WDDWW',
    'WWWW.......WWWW',
    'WWW.........WWW'
  ];
  var SIZE = 15;
  var MID = 7;
  var COLORS = { W: '#F4F4F1', D: '#33354C', M: '#F54BF7' };
  var DEPTH = { magenta: '#F54BF7', cyan: '#00DEE6' };
  var REGIONS = ['tl', 'tr', 'bl', 'br', 'core'];

  // The centre row/column stay as the "core" (the player square); the four
  // diagonal arms are the arrows that separate during the logo interaction.
  function region(x, y) {
    if (x === MID || y === MID) return 'core';
    return (y < MID ? 't' : 'b') + (x < MID ? 'l' : 'r');
  }

  function cells() {
    var out = [];
    for (var y = 0; y < SIZE; y++) {
      for (var x = 0; x < SIZE; x++) {
        var c = GRID[y].charAt(x);
        if (c !== '.') out.push({ x: x, y: y, c: c, region: region(x, y) });
      }
    }
    return out;
  }

  // Merge horizontal runs of matching cells into one path per colour.
  function pathFor(list, test) {
    var d = '';
    for (var y = 0; y < SIZE; y++) {
      var run = -1;
      for (var x = 0; x <= SIZE; x++) {
        var hit = x < SIZE && list.some(function (cell) { return cell.x === x && cell.y === y && test(cell); });
        if (hit && run < 0) run = x;
        if (!hit && run >= 0) {
          d += 'M' + run + ' ' + y + 'h' + (x - run) + 'v1h-' + (x - run) + 'z';
          run = -1;
        }
      }
    }
    return d;
  }

  function layer(list, cls, colorFor) {
    var out = '<g class="' + cls + '">';
    REGIONS.forEach(function (r) {
      var inRegion = list.filter(function (cell) { return cell.region === r; });
      out += '<g class="sym-r sym-r--' + r + '">';
      Object.keys(colorFor).forEach(function (key) {
        var d = pathFor(inRegion, function (cell) { return key === '*' || cell.c === key; });
        if (d) out += '<path fill="' + colorFor[key] + '" d="' + d + '"/>';
      });
      out += '</g>';
    });
    return out + '</g>';
  }

  /*
   * svg({ grouped, depth, title, className })
   *   grouped → arms/core in separate groups so CSS can move them
   *   depth   → adds the extruded magenta + cyan edge layers (hidden by CSS until needed)
   */
  function svg(opts) {
    opts = opts || {};
    var list = cells();
    var label = opts.title ? ' role="img" aria-label="' + opts.title + '"' : ' aria-hidden="true" focusable="false"';
    var pad = opts.grouped ? 1.5 : 0;
    var vb = (-pad) + ' ' + (-pad) + ' ' + (SIZE + pad * 2 + (opts.depth ? 0.75 : 0)) + ' ' + (SIZE + pad * 2 + (opts.depth ? 0.75 : 0));
    var out = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" shape-rendering="crispEdges" class="' +
      (opts.className || 'ux-symbol') + '"' + label + '>';
    if (opts.title) out += '<title>' + opts.title + '</title>';
    if (opts.depth) {
      out += '<g class="sym-depth sym-depth--cyan" transform="translate(.75 .75)">' +
        layer(list, 'sym-layer', { '*': DEPTH.cyan }) + '</g>';
      out += '<g class="sym-depth sym-depth--magenta" transform="translate(.4 .4)">' +
        layer(list, 'sym-layer', { '*': DEPTH.magenta }) + '</g>';
    }
    out += layer(list, 'sym-fill', COLORS);
    return out + '</svg>';
  }

  var api = { GRID: GRID, SIZE: SIZE, COLORS: COLORS, cells: cells, region: region, svg: svg };
  root.USERSX_SYMBOL = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
