"""Build the favicon, Apple touch icon, and Open Graph image from logo.png.

Run from the web directory: python3 scripts/generate_assets.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PUBLIC = Path(__file__).resolve().parents[1] / "public"
LOGO = PUBLIC / "logo.png"
NAVY = (19, 41, 61)
ACCENT = (154, 84, 31)
WHITE = (255, 255, 255)
SOFT = (214, 222, 230)
SERIF = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SANS = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
SANS_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"


def logo(size: int) -> Image.Image:
    image = Image.open(LOGO).convert("RGBA")
    return image.resize((size, size), Image.Resampling.LANCZOS)


def open_graph() -> Image.Image:
    image = Image.new("RGB", (1200, 630), NAVY)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 1200, 10), fill=ACCENT)
    mark = logo(168)
    image.paste(mark, (80, 196), mark)
    eyebrow = ImageFont.truetype(SANS_BOLD, 28)
    headline = ImageFont.truetype(SERIF, 68)
    sub = ImageFont.truetype(SANS, 30)
    draw.text((300, 180), "RAG EVALUATION LAB", font=eyebrow, fill=SOFT)
    draw.text((300, 240), "Multi-index retrieval", font=headline, fill=WHITE)
    draw.text((300, 324), "and reranking.", font=headline, fill=WHITE)
    draw.text((300, 470), "Recall@5  0.833     MRR  0.779 with BM25", font=sub, fill=SOFT)
    return image


def main() -> None:
    if not LOGO.is_file():
        raise SystemExit(f"Logo not found: {LOGO}")
    master = logo(48)
    master.save(PUBLIC / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    logo(180).save(PUBLIC / "apple-touch-icon.png")
    open_graph().save(PUBLIC / "og.png", optimize=True)
    print(f"Wrote assets from {LOGO.name}")


if __name__ == "__main__":
    main()
