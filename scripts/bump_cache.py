"""ASCII-only cache bump. Always UTF-8 round-trip. Never use editor StrReplace on index.html."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]


def bump_file(path: Path, pattern: str, repl: str) -> None:
    text = path.read_text(encoding="utf-8")
    new, n = re.subn(pattern, repl, text, count=1)
    if n != 1:
        raise SystemExit(f"{path.name}: expected 1 match for {pattern!r}, got {n}")
    path.write_text(new, encoding="utf-8", newline="\n")
    print(f"updated {path.relative_to(ROOT)}")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: python scripts/bump_cache.py 29v")
    ver = sys.argv[1]
    if not re.fullmatch(r"[0-9]+[a-z]?", ver):
        raise SystemExit("version like 29u")
    html = ROOT / "index.html"
    text = html.read_text(encoding="utf-8")
    new, n = re.subn(r"\./js/main\.js\?v=[0-9]+[a-z]?", f"./js/main.js?v={ver}", text)
    if n < 1:
        raise SystemExit(f"index.html: expected main.js?v= tokens, got {n}")
    html.write_text(new, encoding="utf-8", newline="\n")
    print(f"updated index.html ({n} tokens)")
    bump_file(
        ROOT / "js" / "main.js",
        r"from '\./vfx/skillVfx\.js\?v=[^']+'",
        f"from './vfx/skillVfx.js?v={ver}'",
    )


if __name__ == "__main__":
    main()
