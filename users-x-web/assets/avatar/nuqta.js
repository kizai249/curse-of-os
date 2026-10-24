/*
 * «نقطة · NUQTA» — original USERS-X guide avatar (pixel art, SVG).
 * Name from the brand line «كل لاعب هو نقطة التقاطع».
 * Every part is a list of pixel rectangles [x, y, w, h, colour]. Parts that
 * carry the die-cut sticker edge get a 1px Void line + 2px Bone edge, and the
 * brand depth (magenta step + cyan edge) behind it — like the official sticker.
 * Spec and 3D hand-off notes: docs/AVATAR_SPEC.md. To swap in a GLB/GLTF model,
 * replace USERSX_AVATAR.svg() via the renderer hook in script.js (Avatar class).
 */
(function (root) {
  'use strict';

  var C = {
    bone: '#F4F4F1', void: '#0B0B0F', cyan: '#00DEE6', magenta: '#F54BF7',
    shade: '#33354C', hood: '#1B1C25', hood2: '#2B2C3A'
  };

  // Grid is 27 × 33 units; the figure is symmetric around x = 12.5.
  var PARTS = {
    armL:  { sticker: true, rects: [[2, 16, 3, 8, 'hood'], [2, 24, 3, 2, 'bone']] },
    armR:  { sticker: true, rects: [[20, 16, 3, 8, 'hood'], [20, 24, 3, 2, 'bone']] },
    armUp: { sticker: true, rects: [[20, 16, 3, 2, 'hood'], [22, 9, 3, 9, 'hood'], [22, 7, 3, 2, 'bone']] },
    legs:  { sticker: true, rects: [[7, 26, 3, 3, 'shade'], [15, 26, 3, 3, 'shade'], [6, 29, 4, 2, 'bone'], [15, 29, 4, 2, 'bone']] },
    neck:  { sticker: true, rects: [[10, 13, 5, 3, 'shade']] },
    body:  { sticker: true, rects: [
      [5, 16, 15, 10, 'hood'], [7, 16, 11, 1, 'hood2'],
      [9, 17, 1, 3, 'bone'], [15, 17, 1, 3, 'bone'],          // hoodie drawstrings
      [9, 20, 1, 1, 'magenta'], [15, 20, 1, 1, 'magenta'],    // magenta tips (Merch Drop 01)
      [8, 23, 9, 2, 'hood2']                                  // pocket
    ] },
    core:  { sticker: false, rects: [[11, 18, 3, 3, 'magenta']] },  // the player square — "you"
    head:  { sticker: true, rects: [[4, 4, 17, 9, 'bone']] },
    face:  { sticker: false, rects: [
      [5, 5, 2, 1, 'shade'], [5, 6, 1, 1, 'shade'],           // D-pad arrow notches
      [18, 5, 2, 1, 'shade'], [19, 6, 1, 1, 'shade'],
      [6, 6, 13, 4, 'void']                                   // visor
    ] },
    eyes:      { sticker: false, rects: [[8, 7, 2, 2, 'cyan'], [15, 7, 2, 2, 'cyan']] },
    eyesShut:  { sticker: false, rects: [[8, 8, 2, 1, 'cyan'], [15, 8, 2, 1, 'cyan']] },
    mouth:     { sticker: false, rects: [[11, 11, 3, 1, 'magenta']] },
    mouthOpen: { sticker: false, rects: [[11, 10, 3, 2, 'magenta']] },
    spark:     { sticker: false, rects: [[12, -4, 1, 3, 'cyan'], [11, -3, 3, 1, 'cyan'], [12, -1, 1, 3, 'shade']] }
  };

  // Which moving group each part belongs to (CSS animates these groups).
  var GROUP = {
    armL: 'arm-l', armR: 'arm-r', armUp: 'arm-up', legs: 'base', neck: 'base', body: 'base', core: 'core',
    head: 'head', face: 'head', eyes: 'eyes', eyesShut: 'eyes-shut', mouth: 'mouth', mouthOpen: 'mouth-open', spark: 'head'
  };
  var ORDER = ['armL', 'armR', 'armUp', 'legs', 'neck', 'body', 'core', 'head', 'face', 'eyes', 'eyesShut', 'mouth', 'mouthOpen', 'spark'];

  function rect(r, grow, dx, dy, fill) {
    return '<rect x="' + (r[0] - grow + dx) + '" y="' + (r[1] - grow + dy) + '" width="' + (r[2] + grow * 2) +
      '" height="' + (r[3] + grow * 2) + '" fill="' + fill + '"/>';
  }

  // Alternate poses, only needed when the avatar is animated.
  var ALT = { armUp: true, eyesShut: true, mouthOpen: true };

  function layer(name, grow, dx, dy, fixedColour, still) {
    var out = '<g class="nq-layer nq-layer--' + name + '">';
    ORDER.forEach(function (key) {
      var part = PARTS[key];
      if (still && ALT[key]) return;
      if (grow > 0 && !part.sticker) return;
      if (grow === 0 && fixedColour) return;
      out += '<g class="nq-g nq-g--' + GROUP[key] + ' nq-p--' + key + '">';
      part.rects.forEach(function (r) { out += rect(r, grow, dx, dy, fixedColour || C[r[4]]); });
      out += '</g>';
    });
    return out + '</g>';
  }

  // svg({ title, className, still }) — still: single default pose (static file export)
  function svg(opts) {
    opts = opts || {};
    var label = opts.title ? ' role="img" aria-label="' + opts.title + '"' : ' aria-hidden="true" focusable="false"';
    return '<svg xmlns="http://www.w3.org/2000/svg" class="nq ' + (opts.className || '') + '" viewBox="-1 -5 31 41" shape-rendering="crispEdges"' +
      label + ' data-arm="down" data-mouth="closed" data-eyes="open">' +
      (opts.title ? '<title>' + opts.title + '</title>' : '') +
      layer('cyan', 2, 2, 2, C.cyan, opts.still) +
      layer('magenta', 2, 1, 1, C.magenta, opts.still) +
      layer('edge', 2, 0, 0, C.bone, opts.still) +
      layer('line', 1, 0, 0, C.void, opts.still) +
      layer('fill', 0, 0, 0, null, opts.still) +
      '</svg>';
  }

  var api = { COLORS: C, PARTS: PARTS, svg: svg };
  root.USERSX_AVATAR = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
