"""Rename the brand inside photos/mockups by removing the pixels of two letters.

ضماناتي -> ضماني : the word is three joined groups in visual order [يت][نا][ضما].
    Cut from the middle of the ي–ت baseline join to the middle of the ا–ن baseline join,
    so ي meets ن on the same baseline stroke. The ت, its dots and the ا disappear.
Damanati -> Damani : letters are separate; cut from the gap after "n" to the gap before "i".

Every remaining pixel is the photo's own (lighting, texture, perspective untouched).
Work happens in a rectified crop (rotated so the text is horizontal), then only the changed
band is warped back and blended in.

An occurrence is a dict:
  box   : (cx, cy, w, h, angle_deg)  rotated rectangle around the word (+ a little margin)
  lang  : "ar" | "en"
  keep  : "left" | "right" | "center"   which end of the word stays put
  ink   : "light" | "dark"               text lighter or darker than its background
"""

import json
import sys

import cv2
import numpy as np


def rectify(img, box, scale=1.0, shear=0.0):
    cx, cy, w, h, ang = box
    M = cv2.getRotationMatrix2D((cx, cy), ang, scale)
    M[0, 2] += w * scale / 2 - cx
    M[1, 2] += h * scale / 2 - cy
    if shear:
        # perspective leans the verticals; shear them upright (x += shear * (y - h/2))
        S = np.float64([[1, shear, -shear * h * scale / 2], [0, 1, 0], [0, 0, 1]])
        M = (S @ np.vstack([M, [0, 0, 1]]))[:2]
    crop = cv2.warpAffine(
        img,
        M,
        (int(round(w * scale)), int(round(h * scale))),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )
    return crop, M


def ink_mask(crop, ink, neutral=False):
    g = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY).astype(np.float32)
    bg = np.median(
        np.concatenate(
            [g[:2].ravel(), g[-2:].ravel(), g[:, :2].ravel(), g[:, -2:].ravel()]
        )
    )
    d = (g - bg) if ink == "light" else (bg - g)
    thr = max(18.0, 0.45 * np.percentile(d, 99.5))
    m = (d > thr).astype(np.uint8)
    if neutral:
        # grey/white/black text next to a coloured element (e.g. the green tile): ignore saturated pixels
        sat = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)[..., 1]
        m &= (sat < 60).astype(np.uint8)
        # the coloured element's antialiased edge runs out of the box; letters never touch its top/bottom
        n, lab, st, _ = cv2.connectedComponentsWithStats(m, connectivity=8)
        for i in range(1, n):
            y, hh = st[i, cv2.CC_STAT_TOP], st[i, cv2.CC_STAT_HEIGHT]
            if y == 0 or y + hh >= m.shape[0]:
                m[lab == i] = 0
    return m


def runs(flags):
    """[(start, end)] runs where flags is True"""
    out, s = [], None
    for i, f in enumerate(list(flags) + [False]):
        if f and s is None:
            s = i
        elif not f and s is not None:
            out.append((s, i))
            s = None
    return out


def without_dots(mask):
    """Arabic dots are small separate blobs; drop them so joins read as baseline-only."""
    n, lab, st, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if n <= 1:
        return mask, []
    big = st[1:, cv2.CC_STAT_AREA].max()
    dots = [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] < 0.12 * big]
    clean = mask.copy()
    for i in dots:
        clean[lab == i] = 0
    return clean, [(lab == i) for i in dots]


def cut_columns(mask, lang):
    col = mask.sum(axis=0)
    segs = [r for r in runs(col > 0) if r[1] - r[0] > 1]
    if lang == "en":
        # merge tiny gaps inside a letter is not needed for bold sans; expect D a m a n a t i
        # the last four letters are always n a t i (the D may be cropped out of a photo)
        if len(segs) < 4:
            raise ValueError(f"expected ...n a t i, found {len(segs)} letters: {segs}")
        c1 = (segs[-4][1] + segs[-3][0]) // 2
        c2 = (segs[-2][1] + segs[-1][0]) // 2
        return c1, c2, segs
    # Arabic: the three joined groups, read from the dot-free mask (dots overhang neighbours)
    clean, _ = without_dots(mask)
    groups = [r for r in runs(clean.sum(axis=0) > 0) if r[1] - r[0] > 1]
    if len(groups) != 3:
        raise ValueError(
            f"expected 3 Arabic groups [يت][نا][ضما], found {len(groups)}: {groups}"
        )

    mask, _ = without_dots(mask)

    def thin_mid(g, prefer):
        a, b = g
        # baseline band = the rows where the group's ink is densest horizontally
        prof = mask[:, a:b].sum(axis=1)
        base = int(np.argmax(prof))
        stroke = max(2, int((prof > 0.5 * prof.max()).sum()))
        top, bot = max(0, base - stroke), min(mask.shape[0], base + stroke + 1)
        outside = mask.copy()
        outside[top:bot] = 0
        thin = [
            i
            for i in range(a, b)
            if outside[:, i].sum() == 0 and mask[top:bot, i].sum() > 0
        ]
        tr = runs([i in thin for i in range(a, b)])
        if not tr:
            raise ValueError(f"no baseline-only join found in group {g}")
        tr = [(a + s, a + e) for s, e in tr]
        r = tr[-1]  # the join nearest the tooth on its right
        return r[1] - max(2, stroke // 2)

    # cut just before the ت tooth and just before the ن tooth (same offset):
    # ن lands exactly where ت stood, so the ي–ن join keeps the original join length
    c1 = thin_mid(groups[0], "end")
    c2 = thin_mid(groups[1], "end")
    return c1, c2, groups


def edit_crop(crop, c1, c2, keep, segs, plate, mask, halo=None):
    """Remove the letters between c1 and c2 and close the gap by moving letter pixels only.

    Start from the clean plate (word removed), then paste back the kept letters: the part left of c1
    and the part right of c2, each clipped hard at its cut and moved by its share of the gap.
    Non-text content (tiles, edges, texture) is never moved."""
    w = c2 - c1
    shift_left, shift_right = {"right": (w, 0), "left": (0, -w), "center": (w // 2, -(w - w // 2))}[keep]
    hgt = max(4, int((mask.sum(axis=1) > 0).sum()))
    k = (halo or max(3, hgt // 7)) | 1  # textured backgrounds (fabric) want a tight halo
    halo = cv2.dilate(mask, np.ones((k, k), np.uint8))
    out = plate.astype(np.float32)
    H, W = mask.shape
    for lo, hi, dx in ((0, c1, shift_left), (c2, W, shift_right)):
        part = np.zeros_like(halo)
        part[:, lo:hi] = halo[:, lo:hi]
        alpha = cv2.GaussianBlur(part.astype(np.float32), (0, 0), 0.8)
        alpha[:, :lo] = 0
        alpha[:, hi:] = 0
        M = np.float32([[1, 0, dx], [0, 1, 0]])
        src = cv2.warpAffine(crop, M, (W, H), borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
        a = cv2.warpAffine(alpha, M, (W, H), borderValue=0)[..., None]
        out = out * (1 - a) + src * a
    return np.clip(out, 0, 255).astype(np.uint8)

def refine_angle(img, occ):
    """Measure the text's own tilt from its pixels and correct the hand-estimated angle."""
    box = list(occ["box"])
    for _ in range(2):
        crop, _ = rectify(img, box)
        m = ink_mask(crop, occ["ink"], occ.get("neutral_ink", False))
        pts = cv2.findNonZero(m)
        if pts is None or len(pts) < 50:
            break
        (_, _), (rw, rh), ang = cv2.minAreaRect(pts)
        if rw < rh:
            ang -= 90
        ang = (ang + 45) % 90 - 45
        if abs(ang) < 0.3 or abs(ang) > 12:
            break
        box[4] += ang
    return tuple(box)


def apply(img, occ, debug=None):
    if occ.get("auto_angle"):
        occ = dict(occ, box=refine_angle(img, occ))
    crop, M = rectify(img, occ["box"], shear=occ.get("shear", 0.0))
    crop0 = crop.copy()  # untouched rectified pixels, the reference for "what changed"
    mask = ink_mask(crop, occ["ink"], occ.get("neutral_ink", False))
    c1, c2, segs = cut_columns(mask, occ["lang"])
    mask_kept = mask
    if occ["lang"] == "ar":
        # remove the dots of ت (ي carries its dots below the baseline)
        clean, dots = without_dots(mask)
        base = int(np.argmax(clean.sum(axis=1)))
        kill = np.zeros(mask.shape, np.uint8)
        for d in dots:
            ys, xs = np.where(d)
            # a dot belongs to ت when it sits above the baseline and before the gap
            # between the [يت] and [نا] groups; anything after that gap is ن's dot
            if ys.max() < base and segs[0][0] <= xs.mean() < (segs[0][1] + segs[1][0]) / 2:
                kill |= d.astype(np.uint8)
        mask_kept = (mask & (1 - kill)).astype(np.uint8)
        if kill.any():
            crop = cv2.inpaint(crop, cv2.dilate(kill, np.ones((5, 5), np.uint8)), 5, cv2.INPAINT_TELEA)
    # clean background plate: the word and its soft shadow inpainted away
    hgt = max(4, int((mask.sum(axis=1) > 0).sum()))
    k = max(3, hgt // 7) | 1
    k += 2 * occ.get("plate_extra", 0)  # clear a wider fringe where the print bleeds into texture
    pmask = cv2.dilate(mask, np.ones((k, k), np.uint8))
    if occ.get("neutral_ink"):
        # flat print next to a coloured element: clear the letters' antialiased fringe fully,
        # but never let the plate reach into the coloured element itself
        sat = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)[..., 1]
        coloured = cv2.dilate((sat >= 60).astype(np.uint8), np.ones((5, 5), np.uint8))
        pmask = (pmask & (1 - coloured)).astype(np.uint8)
    plate = cv2.inpaint(crop, pmask, max(3, k), cv2.INPAINT_TELEA)
    edited = edit_crop(crop, c1, c2, occ["keep"], segs, plate, mask_kept, occ.get("halo"))
    # warp back only the changed band
    Minv = cv2.invertAffineTransform(M)
    H, W = img.shape[:2]
    back = cv2.warpAffine(
        edited,
        Minv,
        (W, H),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_TRANSPARENT,
        dst=img.copy(),
    )
    # blend back only pixels that actually changed (untouched pixels stay byte-identical)
    diff = (np.abs(edited.astype(np.int16) - crop0.astype(np.int16)).max(axis=2) > 6).astype(np.uint8)
    diff = cv2.dilate(diff, np.ones((5, 5), np.uint8))
    band = cv2.GaussianBlur(diff.astype(np.float32), (0, 0), 1.5)
    bandw = cv2.warpAffine(band, Minv, (W, H), flags=cv2.INTER_LINEAR, borderValue=0)[
        ..., None
    ]
    res = (
        img.astype(np.float32) * (1 - bandw) + back.astype(np.float32) * bandw
    ).astype(np.uint8)
    if debug:
        cv2.imwrite(
            debug + "_crop.png",
            np.vstack([crop, cv2.cvtColor(mask * 255, cv2.COLOR_GRAY2BGR), edited]),
        )
    return res, {
        "cut": [int(c1), int(c2)],
        "removed_px": int(c2 - c1),
        "segments": [list(map(int, s)) for s in segs],
    }


if __name__ == "__main__":
    with open(sys.argv[1]) as fh:
        spec = json.load(fh)
    for item in spec:
        img = cv2.imread(item["src"], cv2.IMREAD_COLOR)
        if img is None:
            raise SystemExit(f"cannot read image {item['src']}")
        log = []
        for i, occ in enumerate(item["occ"]):
            try:
                img, info = apply(img, occ, debug=item.get("debug") and f"{item['debug']}_{i}")
            except ValueError as e:
                info = {"skipped": str(e), "box": occ["box"]}
            log.append(info)
        if not cv2.imwrite(item["out"], img):
            raise SystemExit(f"cannot write image {item['out']}")
        print(json.dumps({"src": item["src"], "edits": log}, ensure_ascii=False))
