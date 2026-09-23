# -*- coding: utf-8 -*-
"""
生成博客统一品牌封面图（微信/OG 分享卡片用）
配色与网站一致：主色 #0D4336（深祖母绿），强调色 #CE8A62（暖铜）
输出：images/og-cover.png   尺寸 1200x630（微信推荐 1.91:1）
"""

import os
from PIL import Image, ImageDraw, ImageFont

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, "images", "og-cover.png")

W, H = 1200, 630
NAVY = (13, 67, 54)          # #0D4336
NAVY_DARK = (8, 41, 31)      # #08291F
GOLD = (206, 138, 98)        # #CE8A62
GOLD_LIGHT = (227, 178, 149) # #E3B295
WHITE = (255, 255, 255)

# 中文字体候选（Windows）
FONT_CANDIDATES = [
    ("C:/Windows/Fonts/msyhbd.ttc", "C:/Windows/Fonts/msyh.ttc"),
    ("C:/Windows/Fonts/msyhl.ttc", "C:/Windows/Fonts/msyh.ttc"),
    ("C:/Windows/Fonts/simhei.ttf", "C:/Windows/Fonts/simhei.ttf"),
    ("C:/Windows/Fonts/simsun.ttc", "C:/Windows/Fonts/simsun.ttc"),
]


def load_fonts():
    """返回 (bold_path, regular_path)，找不到返回 (None, None)"""
    for bold, regular in FONT_CANDIDATES:
        if os.path.exists(bold) and os.path.exists(regular):
            return bold, regular
    return None, None


def main():
    bold_path, regular_path = load_fonts()
    if not bold_path:
        raise SystemExit("未找到可用的中文字体")

    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)

    # ---- 背景：左侧深绿渐变到右下更深处（横向分段模拟）----
    for x in range(W):
        t = x / (W - 1)
        r = int(NAVY[0] + (NAVY_DARK[0] - NAVY[0]) * t)
        g = int(NAVY[1] + (NAVY_DARK[1] - NAVY[1]) * t)
        b = int(NAVY[2] + (NAVY_DARK[2] - NAVY[2]) * t)
        d.line([(x, 0), (x, H)], fill=(r, g, b))

    # ---- 装饰层（底纹）：单独透明图层 + 低透明度，避免压住文字 ----
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)

    # 右下角同心细弧，整体右下移出文字区，并大幅降低不透明度
    cx, cy = 980, 580
    for i, radius in enumerate(range(70, 240, 34)):
        base = GOLD if i % 2 == 0 else GOLD_LIGHT
        alpha = max(46 - i * 5, 20)          # 由外向内递减，形成柔和底纹
        od.arc([cx - radius, cy - radius, cx + radius, cy + radius],
               start=194, end=346, fill=base + (alpha,), width=3)

    # 左侧竖条：位于文字左侧留白区，同为底纹处理
    for i, x in enumerate(range(80, 80 + 6 * 14, 14)):
        base = GOLD if i % 2 == 0 else GOLD_LIGHT
        od.line([(x, 150), (x, 470)], fill=base + (78,), width=3)

    # 将装饰层合成到背景之上、文字之下
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    d = ImageDraw.Draw(img)

    # ---- 文字（最上层，不透明，保证任何情况下都不被干扰）----
    f_title = ImageFont.truetype(bold_path, 76)
    f_sub = ImageFont.truetype(regular_path, 34)
    f_org = ImageFont.truetype(regular_path, 26)

    x_text = 200

    # 主标题
    d.text((x_text, 200), "陈思杰律师", font=f_title, fill=WHITE)

    # 铜色短分隔线
    d.rectangle([x_text, 312, x_text + 130, 318], fill=GOLD)

    # 副标题：专业方向
    d.text((x_text, 344), "专注劳动争议 · 知识产权 · 人工智能法律",
           font=f_sub, fill=GOLD_LIGHT)

    # 机构
    d.text((x_text, 410), "浙江律凡律师事务所", font=f_org, fill=(200, 214, 208))

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print("已生成:", OUT, "尺寸:", img.size)


if __name__ == "__main__":
    main()
