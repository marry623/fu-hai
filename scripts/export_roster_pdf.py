# -*- coding: utf-8 -*-
"""Export 浮骸名册 canvas → PDF on Desktop (reportlab)."""
from __future__ import annotations

import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

CANVAS = Path.home() / ".cursor" / "projects" / "c-Users-Lenovo-Desktop-3" / "canvases" / "roster-catalog.canvas.tsx"
OUT = Path.home() / "Desktop" / "浮骸名册.pdf"
SEAS = ["练习湾", "珊瑚浅滩", "缠绕藻林", "沉船雾区", "雷暴裂口", "熔岩海沟"]

FONT = "SimHei"
pdfmetrics.registerFont(TTFont(FONT, r"C:\Windows\Fonts\simhei.ttf"))


def parse_string_array(blob: str) -> list[str]:
    out: list[str] = []
    i = 0
    n = len(blob)
    while i < n:
        while i < n and blob[i] in " \t\n\r,":
            i += 1
        if i >= n:
            break
        q = blob[i]
        if q not in "\"'":
            break
        i += 1
        buf: list[str] = []
        while i < n:
            c = blob[i]
            if c == "\\" and i + 1 < n:
                buf.append(blob[i + 1])
                i += 2
                continue
            if c == q:
                i += 1
                break
            buf.append(c)
            i += 1
        out.append("".join(buf))
    return out


def find_balanced(src: str, start: int, open_c: str, close_c: str) -> tuple[str, int]:
    depth = 0
    i = start
    while i < len(src):
        c = src[i]
        if c in "\"'":
            q = c
            i += 1
            while i < len(src):
                if src[i] == "\\" and i + 1 < len(src):
                    i += 2
                    continue
                if src[i] == q:
                    i += 1
                    break
                i += 1
            continue
        if c == open_c:
            depth += 1
        elif c == close_c:
            depth -= 1
            if depth == 0:
                return src[start : i + 1], i + 1
        i += 1
    raise ValueError("unbalanced")


def extract_table_jsx(src: str, start: int) -> tuple[str, int] | None:
    """Return (<Table ... />, end) for self-closing Table JSX."""
    i = start
    if not src.startswith("<Table", i):
        return None
    j = i + 6
    in_str = None
    while j < len(src):
        c = src[j]
        if in_str:
            if c == "\\" and j + 1 < len(src):
                j += 2
                continue
            if c == in_str:
                in_str = None
            j += 1
            continue
        if c in "\"'":
            in_str = c
            j += 1
            continue
        if src.startswith("/>", j):
            return src[i : j + 2], j + 2
        j += 1
    return None


def extract_tables(src: str) -> list[tuple[int, list[str], list[list[str]]]]:
    tables = []
    for m in re.finditer(r"<Table\b", src):
        got = extract_table_jsx(src, m.start())
        if not got:
            continue
        block, _ = got
        hm = re.search(r"headers=\{(\[[\s\S]*?\])\}", block)
        if not hm:
            continue
        headers = parse_string_array(hm.group(1)[1:-1])
        rm = re.search(r"rows=\{", block)
        if not rm:
            continue
        arr_start = rm.end()
        rest = block[arr_start:].lstrip()
        if rest.startswith("SEAS.map"):
            rows = [[str(i - 1), name] for i, name in enumerate(SEAS)]
        else:
            try:
                arr, _ = find_balanced(block, arr_start, "[", "]")
            except ValueError:
                continue
            inner = arr[1:-1]
            rows = []
            k = 0
            while k < len(inner):
                while k < len(inner) and inner[k] in " \t\n\r,":
                    k += 1
                if k >= len(inner):
                    break
                if inner[k] != "[":
                    k += 1
                    continue
                try:
                    row_blob, nk = find_balanced(inner, k, "[", "]")
                except ValueError:
                    break
                cells = parse_string_array(row_blob[1:-1])
                if cells:
                    rows.append(cells)
                k = nk
        tables.append((m.start(), headers, rows))
    return tables


def extract_blocks(src: str) -> list[tuple[int, str, object]]:
    items: list[tuple[int, str, object]] = []

    for m in re.finditer(r"<H1>([^<]+)</H1>", src):
        items.append((m.start(), "h1", m.group(1).strip()))
    for m in re.finditer(r"<H2>([^<]+)</H2>", src):
        items.append((m.start(), "h2", m.group(1).strip()))
    for m in re.finditer(r"<H3>([^<]+)</H3>", src):
        items.append((m.start(), "h3", m.group(1).strip()))

    for m in re.finditer(
        r'<Callout\s+tone="[^"]*"\s+title="([^"]+)">\s*([\s\S]*?)</Callout>',
        src,
    ):
        title = m.group(1)
        body = re.sub(r"<[^>]+>", "", m.group(2))
        body = re.sub(r"\s+", " ", body).strip()
        items.append((m.start(), "callout", f"{title}\n{body}"))

    for m in re.finditer(r'<CollapsibleSection\s+title="([^"]+)"', src):
        items.append((m.start(), "h2", m.group(1).strip()))

    for m in re.finditer(r"<CardHeader[^>]*>\s*([^<{]+?)\s*</CardHeader>", src):
        t = m.group(1).strip()
        if t:
            items.append((m.start(), "h3", t))

    for m in re.finditer(r"<Text(?:\s[^>]*)?>\s*([\s\S]*?)\s*</Text>", src):
        body = re.sub(r"<[^>]+>", "", m.group(1))
        body = re.sub(r"\s+", " ", body).strip()
        if len(body) < 12 or body.startswith("{"):
            continue
        items.append((m.start(), "p", body))

    for pos, headers, rows in extract_tables(src):
        items.append((pos, "table", (headers, rows)))

    for name, title in [
        ("function Tutorial", "一、新手教程"),
        ("function Monsters", "二、怪物"),
        ("function Fish", "三、鱼"),
        ("function Weapons", "四、武器 / 技能"),
        ("function Economy", "五、商店与经济"),
        ("function ShopOverview", "商店 · 总览"),
        ("function ShopBait", "商店 · 鱼饵"),
        ("function ShopRepair", "商店 · 修补"),
        ("function ShopFishBuy", "商店 · 鱼类直购"),
        ("function ShopSkills", "商店 · 技能牌"),
        ("function ShopTalents", "商店 · 天赋"),
    ]:
        idx = src.find(name)
        if idx >= 0:
            items.append((idx, "section", title))

    items.sort(key=lambda x: x[0])
    return items


def esc(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def build_pdf(items: list[tuple[int, str, object]]) -> None:
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="CNTitle",
            fontName=FONT,
            fontSize=20,
            leading=26,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CNSection",
            fontName=FONT,
            fontSize=15,
            leading=20,
            textColor=colors.HexColor("#0d5c56"),
            spaceBefore=10,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CNH2",
            fontName=FONT,
            fontSize=12.5,
            leading=17,
            spaceBefore=12,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CNH3",
            fontName=FONT,
            fontSize=11,
            leading=15,
            spaceBefore=8,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CNBody",
            fontName=FONT,
            fontSize=9,
            leading=13,
            alignment=TA_LEFT,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CNCell",
            fontName=FONT,
            fontSize=7.5,
            leading=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CNCallout",
            fontName=FONT,
            fontSize=8.5,
            leading=12,
            backColor=colors.HexColor("#f3ebe0"),
            borderPadding=6,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CNLead",
            fontName=FONT,
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#5a4a38"),
            spaceAfter=10,
        )
    )

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm,
        title="浮骸名册",
        author="浮骸",
    )
    story: list = []
    story.append(Paragraph("浮骸名册", styles["CNTitle"]))
    story.append(
        Paragraph(
            "从 Cursor Canvas「浮骸名册」导出 · 含新手教程 / 怪物 / 鱼 / 武器 / 商店（图表略，表格全保留）",
            styles["CNLead"],
        )
    )

    page_w = A4[0] - 24 * mm
    seen_h1 = False
    first_section = True

    for _, kind, payload in items:
        if kind == "h1":
            if not seen_h1:
                seen_h1 = True
                continue
            story.append(Paragraph(esc(str(payload)), styles["CNTitle"]))
        elif kind == "section":
            if not first_section:
                story.append(PageBreak())
            first_section = False
            story.append(Paragraph(esc(str(payload)), styles["CNSection"]))
        elif kind == "h2":
            story.append(Paragraph(esc(str(payload)), styles["CNH2"]))
        elif kind == "h3":
            story.append(Paragraph(esc(str(payload)), styles["CNH3"]))
        elif kind == "callout":
            title, _, body = str(payload).partition("\n")
            story.append(
                Paragraph(
                    f"<b>{esc(title)}</b><br/>{esc(body)}",
                    styles["CNCallout"],
                )
            )
        elif kind == "p":
            story.append(Paragraph(esc(str(payload)), styles["CNBody"]))
        elif kind == "table":
            headers, rows = payload  # type: ignore
            ncol = max(1, len(headers))
            col_w = page_w / ncol
            data = [[Paragraph(esc(h), styles["CNCell"]) for h in headers]]
            for row in rows:
                cells = list(row) + [""] * max(0, ncol - len(row))
                data.append(
                    [Paragraph(esc(c), styles["CNCell"]) for c in cells[:ncol]]
                )
            t = Table(data, colWidths=[col_w] * ncol, repeatRows=1)
            t.setStyle(
                TableStyle(
                    [
                        ("FONTNAME", (0, 0), (-1, -1), FONT),
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8e0d4")),
                        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#1a1008")),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 3),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                        ("TOPPADDING", (0, 0), (-1, -1), 3),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                        (
                            "ROWBACKGROUNDS",
                            (0, 1),
                            (-1, -1),
                            [colors.white, colors.HexColor("#faf6f0")],
                        ),
                    ]
                )
            )
            story.append(KeepTogether([t, Spacer(1, 6)]))

    story.append(Spacer(1, 12))
    story.append(
        Paragraph(
            "Source: roster-catalog.canvas.tsx",
            styles["CNLead"],
        )
    )
    doc.build(story)


def main() -> None:
    src = CANVAS.read_text(encoding="utf-8")
    items = extract_blocks(src)
    n_tables = sum(1 for i in items if i[1] == "table")
    if n_tables < 10:
        raise SystemExit(f"too few tables parsed: {n_tables}")
    build_pdf(items)
    print(f"OK -> {OUT}")
    print(f"size={OUT.stat().st_size} items={len(items)} tables={n_tables}")


if __name__ == "__main__":
    main()
