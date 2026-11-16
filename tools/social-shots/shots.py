#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Testimonial chat-screenshot generator for @Auralis_Pearl.

Persian text is shaped with HarfBuzz (the engine browsers use) and emitted as
SVG paths, so word order, joining and bidi are correct. Numbers/latin runs are
shaped LTR. Images are 900 px wide with the long side kept near 1280 so
Telegram does not shrink them and the text stays readable on a phone.
"""
import os
import random
import subprocess
import tempfile

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFilter

FONT_DIR = os.environ.get("VAZIR_DIR", "/tmp/shot/node_modules/vazirmatn/fonts/ttf")
FONT_FILES = {
    "regular": "Vazirmatn-Regular.ttf",
    "medium": "Vazirmatn-Medium.ttf",
    "semibold": "Vazirmatn-SemiBold.ttf",
    "bold": "Vazirmatn-Bold.ttf",
}


# ---------------------------------------------------------------- font engine
class Face:
    def __init__(self, path):
        self.path = path
        blob = hb.Blob.from_file_path(path)
        self.face = hb.Face(blob)
        self.font = hb.Font(self.face)
        self.upem = self.face.upem
        self.tt = TTFont(path)
        self.glyphs = self.tt.getGlyphSet()
        self.order = self.tt.getGlyphOrder()

    def shape(self, text, size, rtl=True):
        scale = size / self.upem
        buf = hb.Buffer()
        buf.add_str(text)
        buf.direction = "rtl" if rtl else "ltr"
        buf.script = "Arab"
        buf.language = "fa"
        hb.shape(self.font, buf, {"kern": True, "liga": True, "calt": True})
        x = 0.0
        parts = []
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            name = self.order[info.codepoint]
            pen = SVGPathPen(self.glyphs)
            self.glyphs[name].draw(
                TransformPen(
                    pen,
                    (scale, 0, 0, -scale, x + pos.x_offset * scale, -pos.y_offset * scale),
                )
            )
            d = pen.getCommands()
            if d:
                parts.append(d)
            x += pos.x_advance * scale
        return " ".join(parts), x


_FACES = {}


def face(weight="medium"):
    if weight not in _FACES:
        _FACES[weight] = Face(os.path.join(FONT_DIR, FONT_FILES[weight]))
    return _FACES[weight]


# --------------------------------------------------------------- bidi helpers
NEUTRAL = set("،؛؟٬«»()[]٫٪!.,:;'\"-–…")


def _is_ltr_char(ch):
    """Digits (Persian, Arabic-Indic or ASCII) and latin letters run left-to-right."""
    o = ord(ch)
    if 0x06F0 <= o <= 0x06F9:      # ۰-۹
        return True
    if 0x0660 <= o <= 0x0669:      # ٠-٩
        return True
    if "0" <= ch <= "9":
        return True
    return "a" <= ch.lower() <= "z"


def _is_rtl_char(ch):
    o = ord(ch)
    if ch in NEUTRAL:
        return True
    if _is_ltr_char(ch):
        return False
    return 0x0600 <= o <= 0x06FF or 0xFB50 <= o <= 0xFDFF or 0xFE70 <= o <= 0xFEFF


LTR_JOINERS = set(":./-+٬,٪%()")


def segments(token):
    # a number like ۱۲:۰۶ or ۱٬۷۰۰٬۰۰۰ stays left-to-right as one run
    if any(_is_ltr_char(c) for c in token) and all(
        _is_ltr_char(c) or c in LTR_JOINERS for c in token
    ):
        return [("ltr", token)]
    out = []
    for ch in token:
        kind = "ltr" if _is_ltr_char(ch) else "rtl"
        if out and out[-1][0] == kind:
            out[-1][1] += ch
        else:
            out.append([kind, ch])
    return [(k, t) for k, t in out]


def token_metrics(token, size, weight="medium"):
    """(width, list of (dx, path) placed relative to the token's left edge)."""
    f = face(weight)
    shaped = [f.shape(t, size, rtl=(k == "rtl")) for k, t in segments(token)]
    total = sum(w for _, w in shaped)
    placed, cursor = [], total
    for d, w in shaped:            # first run is the right-most one
        cursor -= w
        if d:
            placed.append((cursor, d))
    return total, placed


def space_width(size, weight="medium"):
    return face(weight).shape(" ", size)[1]


def wrap(tokens, max_width, size, weight="medium"):
    sp = space_width(size, weight)
    lines, cur, cur_w = [], [], 0.0
    for tok in tokens:
        w, _ = token_metrics(tok, size, weight)
        if cur and cur_w + sp + w > max_width:
            lines.append(cur)
            cur, cur_w = [tok], w
        else:
            cur_w += (sp if cur else 0) + w
            cur.append(tok)
    if cur:
        lines.append(cur)
    return lines


def line_width(tokens, size, weight="medium"):
    sp = space_width(size, weight)
    return sum(token_metrics(t, size, weight)[0] for t in tokens) + sp * max(
        0, len(tokens) - 1
    )


# --------------------------------------------------------------------- MVG IO
class MVG:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.out = [f"viewbox 0 0 {w} {h}"]

    def rect(self, x1, y1, x2, y2, fill):
        self.out += [f"fill '{fill}'", f"rectangle {x1:.1f},{y1:.1f} {x2:.1f},{y2:.1f}"]

    def round_rect(self, x1, y1, x2, y2, rx, fill, opacity=None):
        self.out.append(f"fill '{fill}'")
        if opacity is not None:
            self.out.append(f"fill-opacity {opacity}")
        self.out.append(
            f"roundrectangle {x1:.1f},{y1:.1f} {x2:.1f},{y2:.1f} {rx:.1f},{rx:.1f}"
        )
        if opacity is not None:
            self.out.append("fill-opacity 1")

    def circle(self, cx, cy, r, fill, opacity=None):
        self.out.append(f"fill '{fill}'")
        if opacity is not None:
            self.out.append(f"fill-opacity {opacity}")
        self.out.append(f"circle {cx:.1f},{cy:.1f} {cx + r:.1f},{cy:.1f}")
        if opacity is not None:
            self.out.append("fill-opacity 1")

    def line(self, x1, y1, x2, y2, stroke, width=3):
        self.out += [
            f"stroke '{stroke}'",
            f"stroke-width {width}",
            "stroke-linecap round",
            f"line {x1:.1f},{y1:.1f} {x2:.1f},{y2:.1f}",
            "stroke 'none'",
        ]

    def poly(self, pts, fill):
        self.out += [
            f"fill '{fill}'",
            "stroke 'none'",
            "polygon " + " ".join(f"{x:.1f},{y:.1f}" for x, y in pts),
        ]

    def text(self, d, fill, x, y):
        if not d:
            return
        self.out += [
            "push graphic-context",
            "stroke 'none'",
            f"fill '{fill}'",
            f"translate {x:.2f},{y:.2f}",
            f"path '{d}'",
            "pop graphic-context",
        ]

    def save(self, path):
        with open(path, "w", encoding="utf-8") as fh:
            fh.write("\n".join(self.out + [""]))
        return path


def render_mvg(mvg, out_png, w, h):
    tmp = mvg.save(out_png + ".mvg")
    subprocess.run(
        ["convert", "-background", "none", "-antialias", "mvg:" + tmp, out_png],
        check=True,
    )
    return out_png


# ------------------------------------------------------------------- photos
def prep_photo(src, size, seed=0, crop="center", radius=18):
    im = Image.open(src).convert("RGB")
    w, h = im.size
    s = min(w, h)
    if crop == "top":
        box = ((w - s) // 2, 0, (w - s) // 2 + s, s)
    elif crop == "bottom":
        box = ((w - s) // 2, h - s, (w - s) // 2 + s, h)
    else:
        box = ((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)
    im = im.crop(box).resize((size, size), Image.LANCZOS)
    im = im.filter(ImageFilter.GaussianBlur(radius=max(0.6, size / 700)))
    px = im.load()
    rnd = random.Random(seed)
    for _ in range(size * size // 7):
        x, y = rnd.randrange(size), rnd.randrange(size)
        r, g, b = px[x, y]
        n = rnd.randint(-14, 14)
        px[x, y] = (
            max(0, min(255, r + n)),
            max(0, min(255, g + n)),
            max(0, min(255, b + n)),
        )
    tmp = os.path.join(tempfile.gettempdir(), f"ph_{abs(seed)}_{size}.jpg")
    im.save(tmp, quality=56)
    im = Image.open(tmp).convert("RGB")
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius, fill=255)
    im.putalpha(mask)
    return im


# ------------------------------------------------------------------- themes
THEMES = {
    "dark": dict(
        chat="#0e1621", header="#17212b", bubble_in="#182533", bubble_out="#2b5278",
        text="#ffffff", dim="#7d8b99", time_in="#7086a0", time_out="#9cc0e4",
        date_bg="#1c2733", date_fg="#8d9aa8", input_bg="#17212b",
        input_field="#242f3d", icon="#708499", accent="#3390ec", hair="#0a121b",
    ),
    "light": dict(
        chat="#e7ebef", header="#ffffff", bubble_in="#ffffff", bubble_out="#effdde",
        text="#101418", dim="#8c99a5", time_in="#9aa7b3", time_out="#6bb162",
        date_bg="#d6dde5", date_fg="#5f6b77", input_bg="#ffffff",
        input_field="#f0f3f6", icon="#8f9aa5", accent="#3390ec", hair="#d6dce3",
    ),
}


# --------------------------------------------------------------- the screen
class Shot:
    def __init__(self, spec):
        self.spec = spec
        self.t = THEMES[spec.get("theme", "dark")]
        self.W = 900
        self.PAD = 26
        self.HEADER_H = 128
        self.INPUT_H = 112
        self.FS = 38
        self.LH = 54
        self.TS = 21
        self.BPAD_X = 24
        self.BPAD_Y = 14
        self.TIME_ROW = 28
        self.RADIUS = 20
        self.PHOTO = 520
        self.TEXT_MAX = 600
        self.layout()

    # ---------------- layout
    def layout(self):
        self.items = []
        y = self.HEADER_H + 52
        for m in self.spec["messages"]:
            kind = m.get("kind", "text")
            if kind == "photo":
                self.items.append(dict(m, kind="photo", w=self.PHOTO, h=self.PHOTO, y=y))
                y += self.PHOTO + 14
                continue
            if kind == "voice":
                self.items.append(dict(m, kind="voice", w=344, h=104, y=y))
                y += 104 + 14
                continue
            lines = wrap(m["text"].split(), self.TEXT_MAX - 2 * self.BPAD_X, self.FS)
            tw = max(line_width(ln, self.FS) for ln in lines)
            if m.get("label"):
                tw = max(tw, face("semibold").shape(m["label"], 22)[1])
            w = min(self.TEXT_MAX, tw + 2 * self.BPAD_X + 4)
            h = len(lines) * self.LH + 2 * self.BPAD_Y + self.TIME_ROW
            self.items.append(dict(m, kind="text", lines=lines, w=w, h=h, y=y))
            y += h + (6 if m.get("tight") else 14)
        self.H = int(y + self.INPUT_H - 6)

    def x_of(self, it):
        if it.get("side", "in") == "in":
            return self.PAD
        return self.W - self.PAD - it["w"]

    # ---------------- draw
    def draw(self, out_png, photos=None):
        W, H, t = self.W, self.H, self.t
        base = MVG(W, H)
        txt = MVG(W, H)
        base.rect(0, 0, W, H, t["chat"])

        # ---- header
        base.rect(0, 0, W, self.HEADER_H, t["header"])
        base.line(0, self.HEADER_H, W, self.HEADER_H, t["hair"], 2)
        base.line(26, 48, 40, self.HEADER_H / 2, t["icon"], 3)
        base.line(26, self.HEADER_H - 48, 40, self.HEADER_H / 2, t["icon"], 3)
        base.circle(108, self.HEADER_H / 2, 33, self.spec.get("avatar", "#e8875c"))
        d, w = face("bold").shape(self.spec.get("initial", "؟"), 30)
        txt.text(d, "#ffffff", 108 - w / 2, self.HEADER_H / 2 + 11)
        d, _ = face("semibold").shape(self.spec.get("name", ""), 30)
        txt.text(d, t["text"], 160, 56)
        d, _ = face("regular").shape(self.spec.get("status", ""), 21)
        txt.text(d, t["dim"], 160, 92)
        for i in range(3):
            base.circle(W - 36, self.HEADER_H / 2 - 13 + i * 13, 2.4, t["icon"])

        # ---- date chip
        label = self.spec.get("date", "امروز")
        d, dw = face("medium").shape(label, 21)
        chip_w = dw + 32
        cx = W / 2 - chip_w / 2
        base.round_rect(cx, self.HEADER_H + 12, cx + chip_w, self.HEADER_H + 40, 14, t["date_bg"])
        txt.text(d, t["date_fg"], cx + 16, self.HEADER_H + 34)

        # ---- messages
        for it in self.items:
            if it["kind"] == "photo":
                continue
            self.draw_bubble(base, txt, it)

        # ---- input bar
        iy = H - self.INPUT_H
        base.rect(0, iy, W, H, t["input_bg"])
        base.line(0, iy, W, iy, t["hair"], 2)
        base.round_rect(56, iy + 22, W - 56, iy + self.INPUT_H - 22, 23, t["input_field"])
        base.line(W - 30, iy + 44, W - 30, iy + self.INPUT_H - 44, t["icon"], 3)
        base.circle(38, iy + self.INPUT_H / 2 - 3, 10, t["icon"])
        base.poly(
            [(34, iy + self.INPUT_H / 2 + 10), (42, iy + self.INPUT_H / 2 + 10),
             (38, iy + self.INPUT_H / 2 + 19)],
            t["icon"],
        )
        d, _ = face("regular").shape("پیام", 24)
        txt.text(d, t["dim"], 74, iy + self.INPUT_H / 2 + 9)

        tmpdir = tempfile.mkdtemp(prefix="shot_")
        canvas = Image.open(
            render_mvg(base, os.path.join(tmpdir, "base.png"), W, H)
        ).convert("RGBA")

        # ---- photos (above bubbles, below text)
        for it in self.items:
            if it["kind"] != "photo" or not photos or it.get("photo") not in photos:
                continue
            img = prep_photo(photos[it["photo"]], it["w"], seed=it.get("seed", 1),
                             crop=it.get("crop", "center"))
            x = self.x_of(it)
            canvas.alpha_composite(img, (x, it["y"]))

        # ---- photo time pills (drawn with the text layer, above the photo)
        for it in self.items:
            if it["kind"] != "photo" or not photos or it.get("photo") not in photos:
                continue
            self.draw_photo_pill(txt, it)

        # ---- text
        canvas.alpha_composite(
            Image.open(render_mvg(txt, os.path.join(tmpdir, "txt.png"), W, H)).convert("RGBA")
        )
        canvas.convert("RGB").save(out_png, optimize=True)
        return out_png

    def write_rtl(self, mvg, text, size, weight, color, x_right, baseline):
        """Lay out one line right-to-left (digits stay left-to-right)."""
        tokens = text.split()
        if not tokens:
            return 0
        sp = space_width(size, weight)
        metrics = [token_metrics(t, size, weight) for t in tokens]
        total = sum(w for w, _ in metrics) + sp * (len(tokens) - 1)
        cursor = x_right - total
        for w, placed in metrics:
            for dx, d in placed:
                mvg.text(d, color, cursor + dx, baseline)
            cursor += w + sp
        return total

    def draw_label(self, txt, label, x_left, baseline, color):
        """Left-aligned RTL label (the `edited` mark sits on the left of a bubble)."""
        sp = space_width(22, "semibold")
        metrics = [token_metrics(tk, 22, "semibold") for tk in label.split()]
        c = x_left
        for w, placed in metrics:
            for dx, d in placed:
                txt.text(d, color, c + dx, baseline)
            c += w + sp

    def draw_photo_pill(self, txt, it):
        label = it.get("time", "")
        sp = space_width(19, "regular")
        tw = sum(token_metrics(t, 19, "regular")[0] for t in label.split())
        pw, ph = tw + 22, 28
        x = self.x_of(it) + it["w"] - 10 - pw
        y = self.y_photo_pill(it)
        txt.round_rect(x, y, x + pw, y + ph, ph / 2, "#000000", 0.52)
        self.write_rtl(txt, label, 19, "regular", "#ffffff", x + pw - 11, y + 19)

    # ---------------- one message
    def y_photo_pill(self, it):
        return it["y"] + it["h"] - 10 - 28

    def draw_bubble(self, base, txt, it):
        t = self.t
        x = self.x_of(it)
        out = it.get("side", "in") == "out"
        fill = t["bubble_out"] if out else t["bubble_in"]
        tail = it.get("tail", True)
        base.round_rect(x, it["y"], x + it["w"], it["y"] + it["h"], self.RADIUS, fill)

        if it["kind"] == "voice":
            cy = it["y"] + 42
            base.circle(x + 42, cy, 22, t["accent"])
            base.poly([(x + 35, cy - 10), (x + 35, cy + 10), (x + 51, cy)], "#ffffff")
            rnd = random.Random(3)
            for i in range(22):
                bh = rnd.choice([8, 14, 20, 28, 34, 24, 16])
                bx = x + 84 + i * 7.4
                base.round_rect(bx, cy - bh / 2, bx + 3, cy + bh / 2, 1.5,
                                t["accent"] if i < 13 else t["dim"])
            self.write_rtl(txt, it.get("dur", "۰:۱۹"), 20, "medium", t["time_in"],
                           x + it["w"] - 16, cy + 7)
            self.write_rtl(txt, it.get("time", ""), self.TS, "regular", t["time_in"],
                           x + it["w"] - 18, it["y"] + it["h"] - 12)
            return

        ty = it["y"] + self.BPAD_Y + self.FS
        for ln in it["lines"]:
            sp = space_width(self.FS)
            total = line_width(ln, self.FS)
            cursor = x + it["w"] - self.BPAD_X - total
            for tok in ln:
                w, placed = token_metrics(tok, self.FS)
                for dx, d in placed:
                    txt.text(d, t["text"], cursor + dx, ty)
                cursor += w + sp
            ty += self.LH

        # time (+ ticks) at the bottom-right corner of the bubble
        time_s = it.get("time", "")
        ty_time = it["y"] + it["h"] - 10
        tw = sum(token_metrics(t, self.TS, "regular")[0] for t in time_s.split())
        tw += space_width(self.TS, "regular") * max(0, len(time_s.split()) - 1)
        self.write_rtl(txt, time_s, self.TS, "regular",
                       t["time_out"] if out else t["time_in"],
                       x + it["w"] - 18, ty_time)
        tx = x + it["w"] - 18 - tw
        if out:
            for k in range(2):
                bx = tx - 26 + k * 11
                base.line(bx, ty_time - 7, bx + 5, ty_time - 2, t["time_out"], 2)
                base.line(bx + 5, ty_time - 2, bx + 12, ty_time - 12, t["time_out"], 2)
        if it.get("label"):
            lw = sum(token_metrics(tk, 22, "semibold")[0] for tk in it["label"].split())
            self.draw_label(txt, it["label"], x + 20, ty_time, t["dim"])
        if tail:
            if out:
                base.poly([(x + it["w"] - 16, it["y"] + it["h"] - 16),
                           (x + it["w"] + 12, it["y"] + it["h"] - 2),
                           (x + it["w"] - 16, it["y"] + it["h"] - 2)], fill)
            else:
                base.poly([(x + 16, it["y"] + it["h"] - 16),
                           (x - 12, it["y"] + it["h"] - 2),
                           (x + 16, it["y"] + it["h"] - 2)], fill)
