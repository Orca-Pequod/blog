# -*- coding: utf-8 -*-
"""
生成博客统一品牌封面图（微信/OG 分享卡片用）

配色与网站一致：主色 #0D4336（深祖母绿），强调色 #CE8A62（暖铜）

为什么是正方形：
  微信对话框卡片与朋友圈的缩略图都是 **1:1 居中裁剪**。
  早期使用 1200x630（1.91:1）横图，被裁掉左右两侧后会切到文字。
  改为 1200x1200 后，缩略图零裁剪，任何取景方式下信息都完整。

输出：images/og-cover-square.png   尺寸 1200x1200
注意：换文件名是为了绕开微信对旧图 URL 的缓存。
"""

import os
from PIL import Image, ImageDraw, ImageFont

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, "images", "og-cover-square.png")

W = H = 1200
NAVY = (13, 67, 54)          # #0D4336
NAVY_DARK = (7, 36, 27)      # 右下更深
GOLD = (206, 138, 98)        # #CE8A62
GOLD_LIGHT = (227, 178, 149) # #E3B295
WHITE = (255, 255, 255)
MUTED = (198, 213, 207)

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


def mix(c1, c2, t):
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


def main():
    bold_path, regular_path = load_fonts()
    if not bold_path:
        raise SystemExit("未找到可用的中文字体")

    # ---- 背景：左上到右下的对角渐变 ----
    # 用 2x2 极简图放大插值，得到平滑渐变（比逐像素快得多）
    grad = Image.new("RGB", (2, 2))
    grad.putpixel((0, 0), NAVY)
    grad.putpixel((1, 0), mix(NAVY, NAVY_DARK, 0.5))
    grad.putpixel((0, 1), mix(NAVY, NAVY_DARK, 0.5))
    grad.putpixel((1, 1), NAVY_DARK)
    img = grad.resize((W, H), Image.BILINEAR)

    # ---- 装饰层：单独透明图层 + 低透明度，永远位于文字下层 ----
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)

    # 右下角同心细弧：置于画面角落，与文字保持距离
    cx, cy = 1030, 1050
    for i, radius in enumerate(range(80, 300, 42)):
        base = GOLD if i % 2 == 0 else GOLD_LIGHT
        alpha = max(46 - i * 5, 20)          # 由外向内递减，形成柔和底纹
        od.arc([cx - radius, cy - radius, cx + radius, cy + radius],
               start=190, end=350, fill=base + (alpha,), width=3)

    # 左上角呼应：一小段铜色细横线
    od.line([(96, 132), (286, 132)], fill=GOLD + (110,), width=4)

    # 合成装饰层到背景之上、文字之下
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    d = ImageDraw.Draw(img)

    # ---- 文字（最上层，不透明）----
    f_title = ImageFont.truetype(bold_path, 124)
    f_sub = ImageFont.truetype(regular_path, 40)
    f_org = ImageFont.truetype(regular_path, 30)

    def center_text(y, text, font, fill):
        w = d.textlength(text, font=font)
        d.text(((W - w) / 2, y), text, font=font, fill=fill)
        return w

    # 垂直居中排版：标题 / 分隔线 / 副标题 / 机构
    y_title = 428
    center_text(y_title, "陈思杰律师", f_title, WHITE)

    # 铜色短分隔线（水平居中）
    line_w = 180
    d.rectangle([(W - line_w) / 2, 606, (W + line_w) / 2, 614], fill=GOLD)

    center_text(654, "专注劳动争议 · 知识产权 · 人工智能法律", f_sub, GOLD_LIGHT)
    center_text(742, "浙江律凡律师事务所", f_org, MUTED)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    size_kb = os.path.getsize(OUT) / 1024
    print("已生成:", OUT)
    print("尺寸:", img.size, " 大小: %.1f KB" % size_kb)


if __name__ == "__main__":
    main()
