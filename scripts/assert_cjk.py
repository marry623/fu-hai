"""Fail if index.html Chinese was turned into ? / U+FFFD (Cursor StrReplace on Windows)."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "index.html").read_text(encoding="utf-8")
cjk = sum(1 for c in html if "\u4e00" <= c <= "\u9fff")
title = html.split("<title>", 1)[1].split("</title>", 1)[0]
errors = []
if "\ufffd" in html:
    errors.append("contains U+FFFD replacement char")
if cjk < 300:
    errors.append(f"CJK count {cjk} < 300")
if "?" in title or "\ufffd" in title:
    errors.append(f"title looks corrupted: {title!r}")
# Static HUD labels that must stay Chinese (not JS ?? nullish coalescing)
if "weapon-bar" in html and "\u971c\u77db" not in html and "\u9c7c\u53c9" not in html:
    errors.append("weapon-bar missing Chinese skill names")
if errors:
    print("index.html encoding check FAILED:", file=sys.stderr)
    for e in errors:
        print(" -", e, file=sys.stderr)
    sys.exit(1)
print(f"index.html encoding ok (cjk={cjk})")
