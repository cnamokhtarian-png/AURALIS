#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build the four testimonial chat screenshots."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shots import Shot  # noqa: E402

UPL = os.environ.get("UPL", "/tmp/arena-coding-uploads")
OUT = os.environ.get("OUT_DIR", "/tmp/tg/out")
PHOTO_DIR = os.environ.get("PHOTO_DIR", "/tmp/tg/ph")

PHOTOS = {
    "black": f"{UPL}/photo_2026-11-16_19-53-26.jpg",
    "ring": f"{UPL}/photo_2026-11-16_19-53-12.jpg",
    "pastel": f"{UPL}/photo_2026-11-16_19-53-05.jpg",
    "green": f"{PHOTO_DIR}/green.jpg",
}

SPECS = {
    "01-black-bag": dict(
        theme="dark", name="نازنین", status="آخرین بازدید همین اواخر",
        initial="ن", avatar="#e8875c", date="امروز",
        messages=[
            dict(kind="photo", side="in", photo="black", seed=11, time="۲۱:۱۴", tail=False),
            dict(kind="text", side="in", text="سلام، کیف رسید. خیلی خوشگله", time="۲۱:۱۵", tail=False),
            dict(kind="text", side="in", text="دی‌شب رفتیم عروسی خواهرم، همه می‌پرسیدن از کجا خریدی", time="۲۱:۱۵", tail=True),
            dict(kind="text", side="out", text="سلام عزیزم، خوشحالم که پسندیدی. ممنون که عکس فرستادی", time="۲۱:۱۸"),
        ],
    ),
    "02-ring-box": dict(
        theme="light", name="مریم", status="آخرین بازدید ۱۲ دقیقه پیش",
        initial="م", avatar="#c7749b", date="امروز",
        messages=[
            dict(kind="photo", side="in", photo="ring", seed=22, time="۱۲:۰۶", tail=False),
            dict(kind="text", side="in", text="سلام، جعبه رسید. برای هدیه سالگرد مامانم گرفته بودم", time="۱۲:۰۷", tail=False),
            dict(kind="text", side="in", text="بسته‌بندی‌تون خیلی تمیز بود، ذوق کردم", time="۱۲:۰۸", tail=False),
            dict(kind="voice", side="in", time="۱۲:۱۰", dur="۰:۱۹"),
            dict(kind="text", side="out", text="سلام مریم جان، خوشحالم که خوشش اومد", time="۱۲:۱۲"),
        ],
    ),
    "03-pastel-bag": dict(
        theme="dark", name="زهرا", status="آخرین بازدید ۲ ساعت پیش",
        initial="ز", avatar="#7c8fd6", date="امروز",
        messages=[
            dict(kind="photo", side="in", photo="pastel", seed=33, time="۱۰:۳۲", tail=False),
            dict(kind="text", side="in", text="سلام کیف رسید، رنگ‌هاش خیلی نازه", time="۱۰:۳۳", tail=False),
            dict(kind="text", side="in", text="از نزدیک قشنگ‌تر از عکسه", time="۱۰:۳۴", tail=True),
            dict(kind="text", side="out", text="ممنون زهرا جان، خوشحالم که راضی بودی", time="۱۰:۳۶",
                 label="ویرایش شده"),
        ],
    ),
    "04-green-bag": dict(
        theme="dark", name="الهام", status="آخرین بازدید ۵ دقیقه پیش",
        initial="ا", avatar="#62b6a0", date="امروز",
        messages=[
            dict(kind="photo", side="in", photo="green", seed=44, time="۱۹:۰۵", tail=False),
            dict(kind="text", side="in", text="سلام، کیف سبز رسید. دقیقا همون چیزی بود که تو سایت دیدم", time="۱۹:۰۶", tail=False),
            dict(kind="text", side="out", text="سلام، خوشحالم. رنگش با لباست هم می‌خورد؟", time="۱۹:۰۹"),
            dict(kind="text", side="in", text="خیلی خوب بود، همه تعریف کردن. دو تا از دوستام شماره‌تون رو گرفتن", time="۱۹:۱۲"),
        ],
    ),
}


def build(keys=None):
    os.makedirs(OUT, exist_ok=True)
    for key, spec in SPECS.items():
        if keys and key not in keys:
            continue
        shot = Shot(spec)
        out = os.path.join(OUT, key + ".png")
        shot.draw(out, PHOTOS)
        print(key, shot.W, shot.H, out, os.path.getsize(out))


if __name__ == "__main__":
    build(sys.argv[1:] or None)
