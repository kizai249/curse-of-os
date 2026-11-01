"""Put edited photos back into a PDF in place, keeping every image object's dictionary.

Usage: python3 -I pdf_image_replace.py in.pdf out.pdf edited_dir
  edited_dir holds files named p<page>_<ImageName>.png, e.g. p19_Im1.png
  (page is 1-based; ImageName is the XObject name without extension).

Only the stream bytes change: the same width, height, colour space (the ICC profile stays
attached), filter and object number. JPEG images are re-encoded as JPEG at quality 95 with
no chroma subsampling; Flate images are re-compressed losslessly.
"""

import io
import json
import re
import sys
import zlib
from pathlib import Path

from PIL import Image
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, NumberObject


def no_predictor(xobj):
    """Raw samples only: a PNG/TIFF predictor would need the rows re-encoded."""
    parms = xobj.get("/DecodeParms")
    return parms is None or int(parms.get_object().get("/Predictor", 1)) == 1


def main(src, dst, edited_dir):
    reader = PdfReader(src)
    writer = PdfWriter(clone_from=reader)
    log = []
    for f in sorted(Path(edited_dir).glob("p*_*.png")):
        m = re.fullmatch(r"p(\d+)_(\w+)\.png", f.name)
        if not m:
            continue
        page_no, name = int(m.group(1)), m.group(2)
        xobjects = writer.pages[page_no - 1]["/Resources"]["/XObject"]
        key = "/" + name
        if key not in xobjects:
            raise SystemExit(f"{f.name}: page {page_no} has no image {name}")
        xobj = xobjects[key].get_object()
        img = Image.open(f).convert("RGB")
        w, h = int(xobj["/Width"]), int(xobj["/Height"])
        if img.size != (w, h):
            raise SystemExit(
                f"{f.name}: size {img.size} differs from the PDF image {(w, h)}"
            )
        filt = xobj.get("/Filter")
        if filt == "/DCTDecode":
            buf = io.BytesIO()
            img.save(buf, "JPEG", quality=95, subsampling=0, optimize=True)
            data = buf.getvalue()
        elif filt == "/FlateDecode" and int(xobj["/BitsPerComponent"]) == 8 and no_predictor(xobj):
            data = zlib.compress(img.tobytes(), 9)
        else:
            raise SystemExit(f"{f.name}: unsupported image encoding {filt}")
        before = len(xobj._data)  # encoded stream bytes, as stored in the file
        xobj._data = data
        xobj[NameObject("/Length")] = NumberObject(len(data))
        log.append(
            {
                "page": page_no,
                "image": name,
                "size": [w, h],
                "filter": filt,
                "bytes_before": before,
                "bytes_after": len(data),
            }
        )
    with open(dst, "wb") as fh:
        writer.write(fh)
    print(json.dumps(log, indent=1))


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    try:
        main(*sys.argv[1:4])
    except (OSError, ValueError) as e:  # unreadable PDF/image, failed write, corrupt data
        raise SystemExit(f"image replace failed: {e}")
