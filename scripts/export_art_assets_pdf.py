# -*- coding: utf-8 -*-
"""Export 浮骸 art-asset priority list to Desktop PDF."""
from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUT = Path.home() / "Desktop" / "浮骸_美术资产清单_优先级.pdf"

pdfmetrics.registerFont(TTFont("MSYH", r"C:\Windows\Fonts\msyh.ttc", subfontIndex=0))
pdfmetrics.registerFont(TTFont("MSYHBD", r"C:\Windows\Fonts\msyhbd.ttc", subfontIndex=0))

# priority, category, name, id, deliverable, spec
ASSETS: list[tuple[str, str, str, str, str, str]] = [
    ("P0", "UI 框", "背包/仓库拍立得格", "bp-polaroid", "框 PNG/SVG", "空框+内嵌肖像槽"),
    ("P0", "UI 框", "图鉴大肖像框", "codex-portrait", "框 PNG/SVG", "大框+未解锁剪影"),
    ("P0", "UI 框", "船槽呼出头像框×6", "hub-callout-face", "框 PNG/SVG", "空槽问号字形"),
    ("P0", "UI 框", "整备木框", "hub-wood-frame", "装饰框 PNG/SVG", "船预览外框"),
    ("P0", "UI 框", "玩家头像", "hud-avatar", "头像 PNG", "64–128，现为 CSS 渐变"),
    ("P0", "品牌", "浮骸 Logo 锁扣", "logo-fuhai", "Logo PNG/SVG", "封面/标题"),
    ("P0", "封面", "封面灯塔岛场景", "cover-lighthouse", "关键键艺术 / GLB", "灯塔+小屋+岛"),
    ("P0", "船体", "木筏", "raft", "商店肖像+可选 GLB", "256–512 PNG"),
    ("P0", "船体", "重筏", "heavyRaft", "商店肖像+可选 GLB", "256–512 PNG"),
    ("P0", "船体", "冲锋船", "chargeBoat", "商店肖像+可选 GLB", "256–512 PNG"),
    ("P0", "物资", "粗饵", "baitCrude", "图标 PNG", "256"),
    ("P0", "物资", "鲜饵", "baitFresh", "图标 PNG", "256"),
    ("P0", "物资", "亮鳞饵", "baitScale", "图标 PNG", "256"),
    ("P0", "物资", "深渊饵", "baitAbyss", "图标 PNG", "256"),
    ("P0", "物资", "木板", "plank", "图标 PNG", "256"),
    ("P0", "物资", "修补剂", "repair", "图标 PNG", "256"),
    ("P0", "物资", "龙骨膏", "paste", "图标 PNG", "256"),
    ("P0", "宝物", "密封黑包（未鉴定）", "blackPackage", "肖像 PNG", "256–512，局内/黑市核心"),
    ("P0", "技能", "霜矛", "skillFrost", "技能卡图标 PNG", "256"),
    ("P0", "技能", "雷矛", "skillStorm", "技能卡图标 PNG", "256"),
    ("P0", "技能", "陨石", "skillMeteor", "技能卡图标 PNG", "256"),
    ("P0", "技能", "虚空裂缝", "skillVoid", "技能卡图标 PNG", "256"),
    ("P0", "技能", "炎凤", "skillPhoenix", "技能卡图标 PNG", "256"),
    ("P0", "技能", "引力奇点", "skillSingularity", "技能卡图标 PNG", "256"),
    ("P0", "技能", "根茎绽放", "skillWorldroot", "技能卡图标 PNG", "256"),
    ("P0", "技能", "光束炮", "skillBeam", "技能卡图标 PNG", "256"),
    ("P0", "技能", "电磁陷阱", "skillSnare", "技能卡图标 PNG", "256"),
    ("P0", "技能", "冰封王冠", "skillGlacier", "技能卡图标 PNG", "256"),
    ("P0", "天赋", "鱼贩子的眼睛", "fishmongerEye", "天赋图标 PNG", "256"),
    ("P0", "天赋", "怪谈低语", "cursedBoat", "天赋图标 PNG", "256"),
    ("P0", "天赋", "鬼影航迹", "ghostWake", "天赋图标 PNG", "256"),
    ("P0", "天赋", "漂流嗅觉", "driftNose", "天赋图标 PNG", "256"),
    ("P0", "天赋", "深饵账本", "deepLedger", "天赋图标 PNG", "256"),
    ("P0", "天赋", "撞角黑工", "ramBlacksmith", "天赋图标 PNG", "256"),
    ("P0", "天赋", "锈蚀回执", "rustReceipt", "天赋图标 PNG", "256"),
    ("P1", "漂浮物", "黑色包裹（世界）", "flotsam-package", "世界道具 GLB", "打捞物"),
    ("P1", "漂浮物", "木桶", "flotsam-barrel", "世界道具 GLB", "打捞物"),
    ("P1", "漂浮物", "漂流瓶", "flotsam-bottle", "世界道具 GLB", "打捞物"),
    ("P1", "港口", "出港码头", "hub-depart", "建筑 GLB", "岛屿点击点"),
    ("P1", "港口", "船坞工棚", "hub-prep", "建筑 GLB", "整备"),
    ("P1", "港口", "物资库房", "hub-warehouse", "建筑 GLB", "仓库"),
    ("P1", "港口", "海岛市集", "hub-shop", "建筑 GLB", "商店"),
    ("P1", "港口", "东岛黑市", "hub-blackmarket", "建筑 GLB", "鉴宝"),
    ("P1", "港口", "鱼种展馆", "hub-codex", "建筑 GLB", "图鉴"),
    ("P1", "港口", "图书馆", "hub-library", "建筑 GLB", "手册"),
    ("P1", "鱼族徽", "壳甲", "family-shell", "角标 PNG/SVG", "共鸣徽记"),
    ("P1", "鱼族徽", "墨雾", "family-ink", "角标 PNG/SVG", "共鸣徽记"),
    ("P1", "鱼族徽", "轮机", "family-drive", "角标 PNG/SVG", "共鸣徽记"),
    ("P1", "鱼族徽", "帆雷", "family-gale", "角标 PNG/SVG", "共鸣徽记"),
    ("P1", "鱼族徽", "寒潜", "family-tide", "角标 PNG/SVG", "共鸣徽记"),
    ("P1", "鱼族徽", "骸震", "family-rift", "角标 PNG/SVG", "共鸣徽记"),
    ("P1", "鱼", "食物鱼", "food", "肖像 PNG", "256–512"),
    ("P1", "鱼", "胶水鱼", "glue", "肖像 PNG", "256–512"),
    ("P1", "鱼", "钝吻", "dullSnout", "肖像 PNG", "船头"),
    ("P1", "鱼", "刺豚", "puffer", "肖像 PNG", "船头"),
    ("P1", "鱼", "短剑", "shortSword", "肖像 PNG", "船头"),
    ("P1", "鱼", "剑鱼", "swordfish", "肖像 PNG", "船头"),
    ("P1", "鱼", "冰鱼", "icefish", "肖像 PNG", "船头"),
    ("P1", "鱼", "龙首鱼", "dragonhead", "肖像 PNG", "船头"),
    ("P1", "鱼", "水轮", "paddleWheel", "肖像 PNG", "船尾"),
    ("P1", "鱼", "螺旋鱼", "spiral", "肖像 PNG", "船尾"),
    ("P1", "鱼", "鼓鳃", "gillDrum", "肖像 PNG", "船尾"),
    ("P1", "鱼", "章鱼", "octopus", "肖像 PNG", "船尾"),
    ("P1", "鱼", "水母", "jellyfish", "肖像 PNG", "船尾"),
    ("P1", "鱼", "虚空鳗", "voidEel", "肖像 PNG", "船尾"),
    ("P1", "鱼", "针口", "needleMouth", "肖像 PNG", "左舷"),
    ("P1", "鱼", "喷墨鱼", "ink", "肖像 PNG", "左舷"),
    ("P1", "鱼", "刺鳞", "spikeScale", "肖像 PNG", "左舷"),
    ("P1", "鱼", "螃蟹", "crab", "肖像 PNG", "左舷"),
    ("P1", "鱼", "海蛇", "seaSnake", "肖像 PNG", "左舷"),
    ("P1", "鱼", "巨钳龙虾", "lobster", "肖像 PNG", "左舷"),
    ("P1", "鱼", "薄壳", "thinShell", "肖像 PNG", "右舷"),
    ("P1", "鱼", "贝壳鱼", "shell", "肖像 PNG", "右舷"),
    ("P1", "鱼", "石斑", "grouper", "肖像 PNG", "右舷"),
    ("P1", "鱼", "刺鳐", "stingray", "肖像 PNG", "右舷"),
    ("P1", "鱼", "珊瑚虫", "coral", "肖像 PNG", "右舷"),
    ("P1", "鱼", "镜面水母", "mirrorJelly", "肖像 PNG", "右舷"),
    ("P1", "鱼", "苔衣", "mossCoat", "肖像 PNG", "龙骨"),
    ("P1", "鱼", "藤壶", "barnacle", "肖像 PNG", "龙骨"),
    ("P1", "鱼", "弹跳鱼", "bounce", "肖像 PNG", "龙骨"),
    ("P1", "鱼", "潜游鱼", "dive", "肖像 PNG", "龙骨"),
    ("P1", "鱼", "地脉鱼", "leyline", "肖像 PNG", "龙骨"),
    ("P1", "鱼", "布鳍", "clothFin", "肖像 PNG", "帆"),
    ("P1", "鱼", "旗鱼", "sailfish", "肖像 PNG", "帆"),
    ("P1", "鱼", "雷达鱼", "radar", "肖像 PNG", "帆"),
    ("P1", "鱼", "风暴鱼", "storm", "肖像 PNG", "帆"),
    ("P1", "鱼", "时序鱼", "chrono", "肖像 PNG", "帆"),
    ("P1", "怪物", "碎木海胆", "woodUrchin", "肖像+可选 GLB", "256–512"),
    ("P1", "怪物", "普通藤壶", "barnacle", "肖像+可选 GLB", "256–512"),
    ("P1", "怪物", "锯齿鲨", "sawShark", "肖像+可选 GLB", "256–512"),
    ("P1", "怪物", "水下拖刀蟹", "bladeCrab", "肖像+可选 GLB", "256–512"),
    ("P1", "怪物", "颠倒孢子水母", "sporeJelly", "肖像+可选 GLB", "256–512"),
    ("P1", "怪物", "幽灵钩爪手", "ghostHook", "肖像+可选 GLB", "256–512"),
    ("P1", "怪物", "偷吃獭", "thiefOtter", "肖像+可选 GLB", "256–512"),
    ("P1", "怪物", "喷墨水母", "inkJelly", "肖像+可选 GLB", "256–512"),
    ("P1", "怪物", "避雷针海蛇", "lightningSnake", "肖像+可选 GLB", "256–512"),
    ("P1", "怪物", "虚空盗贼章鱼", "voidOctopus", "肖像+可选 GLB", "256–512"),
    ("P1", "怪物", "深海撼浪鲸", "waveWhale", "肖像+可选 GLB", "256–512"),
    ("P1", "怪物", "熔岩藤壶", "lavaBarnacle", "肖像+可选 GLB", "256–512"),
    ("P1", "怪物", "巨口鲨", "shark", "肖像+可选 GLB", "256–512"),
    ("P1", "怪物", "冰霜海蛇", "serpent", "肖像+可选 GLB", "256–512"),
    ("P2", "宝物 T1", "五铢残币", "wuzhuCoin", "肖像 PNG", "256–512"),
    ("P2", "宝物 T1", "圣甲虫釉护符", "scarabAmulet", "肖像 PNG", "256–512"),
    ("P2", "宝物 T1", "希腊陶油灯嘴", "greekOilLamp", "肖像 PNG", "256–512"),
    ("P2", "宝物 T1", "罗马搅胎玻璃珠", "romanGlassBead", "肖像 PNG", "256–512"),
    ("P2", "宝物 T1", "唐三彩碎釉片", "sancaiShard", "肖像 PNG", "256–512"),
    ("P2", "宝物 T1", "青花口沿残片", "bluePorcelainRim", "肖像 PNG", "256–512"),
    ("P2", "宝物 T1", "铜镜弦纹残弧", "bronzeMirrorArc", "肖像 PNG", "256–512"),
    ("P2", "宝物 T1", "甲骨拓墨残页", "oracleBoneRub", "肖像 PNG", "256–512"),
    ("P2", "宝物 T1", "玛雅青玉管珠", "mayaJadeBead", "肖像 PNG", "256–512"),
    ("P2", "宝物 T1", "江户小判箔屑", "edoKobanChip", "肖像 PNG", "256–512"),
    ("P2", "宝物 T1", "波斯釉砖碎角", "persianGlazeTile", "肖像 PNG", "256–512"),
    ("P2", "宝物 T1", "维京银臂环断片", "vikingArmRing", "肖像 PNG", "256–512"),
    ("P2", "宝物 T2", "罗塞塔碑拓残页", "rosettaRubbing", "肖像 PNG", "256–512"),
    ("P2", "宝物 T2", "汉谟拉比法典泥摹", "hammurabiClay", "肖像 PNG", "256–512"),
    ("P2", "宝物 T2", "坐姿书吏小像摹", "seatedScribeFig", "肖像 PNG", "256–512"),
    ("P2", "宝物 T2", "汝窑天青釉片", "ruCeladonChip", "肖像 PNG", "256–512"),
    ("P2", "宝物 T2", "掐丝珐琅缠枝残片", "cloisonneLotus", "肖像 PNG", "256–512"),
    ("P2", "宝物 T2", "郎窑红釉瓶片", "langyaoRedShard", "肖像 PNG", "256–512"),
    ("P2", "宝物 T2", "雅典娜猫头鹰银币", "athenaOwlCoin", "肖像 PNG", "256–512"),
    ("P2", "宝物 T2", "秦俑甲片摹形", "terracottaArmor", "肖像 PNG", "256–512"),
    ("P2", "海域", "练习湾氛围", "biome-practice", "概念图 / LUT", "天空水色"),
    ("P2", "海域", "珊瑚浅滩氛围", "biome-coral", "概念图 / LUT", "天空水色"),
    ("P2", "海域", "缠绕藻林氛围", "biome-kelp", "概念图 / LUT", "天空水色"),
    ("P2", "海域", "沉船雾区氛围", "biome-wreck", "概念图 / LUT", "天空水色"),
    ("P2", "海域", "雷暴裂口氛围", "biome-rift", "概念图 / LUT", "天空水色"),
    ("P2", "海域", "熔岩海沟氛围", "biome-trench", "概念图 / LUT", "天空水色"),
    ("P2", "鱼★5", "雷核鱼", "thunderCore", "肖像 PNG", "裂口传说"),
    ("P2", "鱼★5", "磁锚鳗", "magAnchor", "肖像 PNG", "裂口传说"),
    ("P2", "鱼★5", "电棘", "voltSpine", "肖像 PNG", "裂口传说"),
    ("P2", "鱼★5", "离子膜", "ionVeil", "肖像 PNG", "裂口传说"),
    ("P2", "鱼★5", "闪回帆", "flashSail", "肖像 PNG", "裂口传说"),
    ("P2", "鱼★5", "熔喉鱼", "magmaMaw", "肖像 PNG", "海沟传说"),
    ("P2", "鱼★5", "热泵鱼", "heatPump", "肖像 PNG", "海沟传说"),
    ("P2", "鱼★5", "焦油鞭", "tarWhip", "肖像 PNG", "海沟传说"),
    ("P2", "鱼★5", "黑曜心", "obsidianHeart", "肖像 PNG", "海沟传说"),
    ("P2", "鱼★5", "沉渊壳", "abyssShell", "肖像 PNG", "海沟传说"),
    ("P3", "宝物 T3", "上河图绢本残绢", "qingmingSilkScrap", "肖像 PNG", "512"),
    ("P3", "宝物 T3", "金瓯永固杯仿影", "jinOuCupEcho", "肖像 PNG", "512"),
    ("P3", "宝物 T3", "米洛维纳斯臂石膏摹", "venusArmCast", "肖像 PNG", "512"),
    ("P3", "宝物 T3", "胜利女神翼羽残摹", "samothraceFeather", "肖像 PNG", "512"),
    ("P3", "宝物 T4", "翠玉白菜仿影", "jadeCabbageEcho", "英雄肖像 PNG", "512+"),
    ("P3", "宝物 T4", "图坦金面箔摹", "tutMaskFoil", "英雄肖像 PNG", "512+"),
    ("P3", "鱼★6", "无面齿", "facelessFang", "肖像 PNG", "隐藏"),
    ("P3", "鱼★6", "沉尸矛", "corpseSpear", "肖像 PNG", "隐藏"),
    ("P3", "怪物", "吞噬海沟虫", "trenchWorm", "英雄 GLB+肖像", "Boss"),
    ("P3", "怪物", "触手海怪", "kraken", "英雄 GLB+肖像", "Boss"),
    ("P3", "技能 VFX", "霜矛特效包", "vfx-ice", "特效贴图/网格", "局内释放"),
    ("P3", "技能 VFX", "雷矛特效包", "vfx-thunder", "特效贴图/网格", "局内释放"),
    ("P3", "技能 VFX", "陨石特效包", "vfx-meteor", "特效贴图/网格", "局内释放"),
    ("P3", "技能 VFX", "虚空特效包", "vfx-void", "特效贴图/网格", "局内释放"),
    ("P3", "技能 VFX", "炎凤特效包", "vfx-phoenix", "特效贴图/网格", "局内释放"),
    ("P3", "技能 VFX", "奇点特效包", "vfx-singularity", "特效贴图/网格", "局内释放"),
    ("P3", "技能 VFX", "根茎特效包", "vfx-worldroot", "特效贴图/网格", "局内释放"),
    ("P3", "技能 VFX", "光束特效包", "vfx-beam", "特效贴图/网格", "局内释放"),
    ("P3", "技能 VFX", "陷阱特效包", "vfx-snare", "特效贴图/网格", "局内释放"),
    ("P3", "技能 VFX", "冰冠特效包", "vfx-glacier", "特效贴图/网格", "局内释放"),
    ("P3", "船体套件", "桨/竿/六槽挂点", "boat-kit", "共享 GLB 套件", "可选替换"),
    ("P3", "封面", "封面小帆船/礁石/鸥", "cover-props", "道具 GLB", "可选精修"),
]

PRI_BLURB = {
    "P0": "立刻要 — 商店 / 整备 / 封面高频露出",
    "P1": "高优先 — 局内常看：鱼、怪、漂浮物、港口",
    "P2": "中优先 — 宝物鉴定、海域氛围、传说鱼",
    "P3": "可后置 — 隐藏 / Boss / VFX / 可选 GLB",
}

PRI_COLOR = {
    "P0": colors.Color(0.75, 0.22, 0.22),
    "P1": colors.Color(0.78, 0.48, 0.12),
    "P2": colors.Color(0.18, 0.42, 0.68),
    "P3": colors.Color(0.35, 0.35, 0.38),
}


def p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(text.replace("&", "&amp;"), style)


def build() -> None:
    styles_title = ParagraphStyle(
        "TitleCN", fontName="MSYHBD", fontSize=16, leading=22, alignment=TA_CENTER, spaceAfter=6
    )
    styles_sub = ParagraphStyle(
        "SubCN", fontName="MSYH", fontSize=9, leading=13, alignment=TA_CENTER, textColor=colors.Color(0.3, 0.3, 0.32)
    )
    styles_h = ParagraphStyle(
        "HCN", fontName="MSYHBD", fontSize=11, leading=16, spaceBefore=10, spaceAfter=4
    )
    styles_body = ParagraphStyle("BodyCN", fontName="MSYH", fontSize=8, leading=11)
    styles_cell = ParagraphStyle("CellCN", fontName="MSYH", fontSize=7, leading=9)
    styles_cell_b = ParagraphStyle("CellCNB", fontName="MSYHBD", fontSize=7, leading=9)

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm,
        title="浮骸 · 美术资产清单（按优先级）",
        author="浮骸",
    )

    story = []
    story.append(p("浮骸 · 美术资产清单（按优先级）", styles_title))
    story.append(
        p(
            f"仅美术资产 · 共 {len(ASSETS)} 条 · 现状：仓库 0 张 PNG/GLB（程序化网格 + 运行时烘焙肖像）· 2026-08-21",
            styles_sub,
        )
    )
    story.append(Spacer(1, 4 * mm))
    counts = {k: sum(1 for a in ASSETS if a[0] == k) for k in ("P0", "P1", "P2", "P3")}
    story.append(
        p(
            f"P0 {counts['P0']}　·　P1 {counts['P1']}　·　P2 {counts['P2']}　·　P3 {counts['P3']}",
            styles_sub,
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(
        p(
            "交付约定：肖像/图标优先；世界道具与港口建筑次之。黑包、船体、饵/剂、技能卡、天赋图标列为 P0。",
            styles_body,
        )
    )

    col_w = [22 * mm, 38 * mm, 32 * mm, 42 * mm, 36 * mm]
    headers = ["分类", "名称", "ID", "交付物", "规格"]

    for pri in ("P0", "P1", "P2", "P3"):
        story.append(p(f"{pri}　{PRI_BLURB[pri]}（{counts[pri]}）", styles_h))
        data = [[p(h, styles_cell_b) for h in headers]]
        for _, cat, name, aid, deliverable, spec in (a for a in ASSETS if a[0] == pri):
            data.append(
                [
                    p(cat, styles_cell),
                    p(name, styles_cell),
                    p(aid, styles_cell),
                    p(deliverable, styles_cell),
                    p(spec, styles_cell),
                ]
            )
        t = Table(data, colWidths=col_w, repeatRows=1)
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), PRI_COLOR[pri]),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, -1), "MSYH"),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("GRID", (0, 0), (-1, -1), 0.3, colors.Color(0.75, 0.75, 0.78)),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.Color(0.96, 0.96, 0.97)]),
                    ("LEFTPADDING", (0, 0), (-1, -1), 3),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ]
            )
        )
        story.append(t)

    doc.build(story)
    print(OUT)
    print("bytes", OUT.stat().st_size)
    print("rows", len(ASSETS))


if __name__ == "__main__":
    build()
