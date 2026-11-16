# Testimonial screenshots (chat mock-ups)

Generator for the four "customer chat" images published in the Telegram channel
`@Auralis_Pearl` (posts 19–22, re-issued as 23–26).

The Persian text is **shaped with HarfBuzz** (the same engine browsers use) and
emitted as SVG paths, so joining, bidi and word order are correct. Numbers
(`۱۲:۰۶`, `۰:۱۹`, `۱٬۷۰۰٬۰۰۰`) are shaped left-to-right. The images are 900 px
wide with the long side kept near 1280 px, because Telegram re-encodes photos to
a max long side of ~1280 — that keeps the text sharp on a phone instead of
shrinking it to mush.

## Requirements

```bash
pip3 install uharfbuzz fonttools pillow
npm i vazirmatn            # fonts, looked up in /tmp/shot by default
which convert              # ImageMagick (MVG renderer for the vector layers)
```

`make.py` expects the raw product photos in `UPL` (default
`/tmp/arena-coding-uploads`) and writes to `OUT_DIR` (default `/tmp/tg/out`).

## Run

```bash
python3 tools/social-shots/make.py                 # all four
python3 tools/social-shots/make.py 03-pastel-bag   # just one
```

Then copy the PNGs into `public/images/social/` with the same file names.

## How it fits together

- `shots.py` – font shaping (`Face`), bidi-aware token/segment layout,
  `wrap()`, MVG drawing helpers and the `Shot` class that draws the header,
  date chip, bubbles, photo bubbles, voice bubble and input bar.
- `make.py` – the four conversations (persona, avatar, messages, timings).

Layers are composited in order: chrome + bubbles (MVG) → photo (PIL, degraded to
look like a 2012 phone camera) → text paths + photo time pill (MVG).
