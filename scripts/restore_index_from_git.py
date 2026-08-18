# Restore index.html Chinese from git HEAD, then re-apply ASCII HUD extras.
# Source file is ASCII-only (CJK via \\u escapes) so editors cannot mangle it.
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
html = subprocess.check_output(["git", "show", "HEAD:index.html"], cwd=ROOT).decode("utf-8")

old_hp = '<span id="hp-text">100</span></div>\n        </div>'
new_hp = (
    '<span id="hp-text">100</span></div>\n'
    '          <div class="inv-text" id="inv-text"></div>\n'
    '          <div class="inv-text" id="combo-text"></div>\n'
    "        </div>"
)
if old_hp not in html:
    raise SystemExit("hp-text anchor missing")
html = html.replace(old_hp, new_hp, 1)

old_dist = (
    '<div class="distance-hero"><span id="run-dist">0</span><small>\u7c73</small></div>\n\n'
    '      <div class="hud-center">'
)
new_dist = (
    '<div class="distance-hero"><span id="run-dist">0</span><small>\u7c73</small></div>\n\n'
    '      <div id="evac-countdown" class="evac-countdown hidden"></div>\n\n'
    '      <div class="hud-center">'
)
if old_dist not in html:
    raise SystemExit("distance-hero anchor missing")
html = html.replace(old_dist, new_dist, 1)

old_qte = (
    '<div id="combo-hint" class="prompt hidden"></div>\n'
    '        <div id="qte" class="qte hidden">'
)
new_qte = (
    '<div id="combo-hint" class="prompt hidden"></div>\n'
    '        <div id="tut-guide" class="tut-guide hidden">\n'
    '          <div id="tut-guide-step" class="tut-guide-step"></div>\n'
    '          <h3 id="tut-guide-title" class="tut-guide-title"></h3>\n'
    '          <p id="tut-guide-body" class="tut-guide-body"></p>\n'
    '          <button type="button" id="tut-guide-next" class="tut-guide-btn">'
    "\u4e0b\u4e00\u6b65</button>\n"
    "        </div>\n"
    '        <div id="qte" class="qte hidden">'
)
if old_qte not in html:
    raise SystemExit("qte anchor missing")
html = html.replace(old_qte, new_qte, 1)

html = html.replace("1 \u9c7c\u53c9", "1 \u971c\u77db")
html = html.replace("2 \u5200", "2 \u96f7\u77db")
html = html.replace("3 \u6295\u77f3", "3 \u8dcc\u77f3")
html = html.replace("css/style.css?v=29d", "css/style.css?v=29r")
html = html.replace("await import('./js/main.js?v=29f');", "await import('./js/main.js?v=29u');")

out = ROOT / "index.html"
out.write_text(html, encoding="utf-8", newline="\n")
cjk = sum(1 for c in html if "\u4e00" <= c <= "\u9fff")
print(f"wrote {out} cjk={cjk} bytes={out.stat().st_size}")
