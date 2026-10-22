"""Draw the favicon, Apple touch icon, and Open Graph image.

Run from the web directory: python3 scripts/generate_assets.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1] / "public"
PINE = (30, 77, 58)
CREAM = (244, 240, 230)
INK = (28, 25, 21)
SERIF = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SANS = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
SANS_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"


def graph(draw: ImageDraw.ImageDraw, size: int, color: tuple[int, int, int]) -> None:
    scale = size / 32

    def point(x: float, y: float) -> tuple[float, float]:
        return (x * scale, y * scale)

    lines = [((10, 16), (18, 10)), ((10, 16), (22.5, 20)), ((18, 10), (22.5, 20))]
    width = max(1, round(1.6 * scale))
    for start, end in lines:
        draw.line([point(*start), point(*end)], fill=color, width=width)
    radius = 2.35 * scale
    for x, y in ((10, 16), (18, 10), (22.5, 20)):
        cx, cy = point(x, y)
        draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=color)


def mark(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    radius = max(2, round(size * 7 / 32))
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=PINE)
    graph(draw, size, CREAM)
    return image


def open_graph() -> Image.Image:
    image = Image.new("RGB", (1200, 630), PINE)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 16, 630), fill=CREAM)
    icon = mark(96)
    image.paste(icon, (80, 72), icon)
    eyebrow = ImageFont.truetype(SANS_BOLD, 28)
    headline = ImageFont.truetype(SERIF, 72)
    sub = ImageFont.truetype(SANS, 32)
    draw.text((200, 96), "RAG EVALUATION LAB", font=eyebrow, fill=CREAM)
    draw.text((80, 250), "Multi-index retrieval,", font=headline, fill=CREAM)
    draw.text((80, 340), "measured.", font=headline, fill=CREAM)
    draw.text(
        (80, 500),
        "Recall@5  0.833    MRR  0.779 with BM25    40 reviewed questions",
        font=sub,
        fill=(223, 230, 224),
    )
    return image


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    mark(48).save(ROOT / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    mark(180).save(ROOT / "apple-touch-icon.png")
    open_graph().save(ROOT / "og.png", optimize=True)
    print(f"Wrote assets to {ROOT}")


if __name__ == "__main__":
    main()
