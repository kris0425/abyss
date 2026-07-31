from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ENEMY_DIR = ROOT / "assets" / "enemies"
SIZE = 512
FRAMES = 18
FRAME_MS = 85


def fit_frame(source: Image.Image, frame_index: int, bob: float = 0.0, zoom: float = 0.0) -> Image.Image:
    phase = 2 * math.pi * frame_index / FRAMES
    scale = 1.025 + zoom * (0.5 + 0.5 * math.sin(phase))
    side = round(SIZE * scale)
    image = source.resize((side, side), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (SIZE, SIZE), "black")
    x = (SIZE - side) // 2
    y = (SIZE - side) // 2 + round(bob * math.sin(phase))
    canvas.paste(image, (x, y))
    return canvas


def glow_layer(layer: Image.Image, radius: float = 5.0) -> Image.Image:
    return layer.filter(ImageFilter.GaussianBlur(radius))


def composite_glow(frame: Image.Image, layer: Image.Image, radius: float = 5.0) -> Image.Image:
    frame = Image.alpha_composite(frame.convert("RGBA"), glow_layer(layer, radius))
    return Image.alpha_composite(frame, layer).convert("RGB")


def hacker_effect(frame: Image.Image, index: int) -> Image.Image:
    rng = random.Random(4100 + index)
    result = frame.copy()
    # Horizontal data corruption briefly tears parts of the scene.
    for _ in range(6):
        y = rng.randrange(45, SIZE - 30)
        height = rng.randrange(2, 9)
        shift = rng.choice((-10, -7, 6, 9))
        strip = result.crop((0, y, SIZE, y + height))
        result.paste(strip, (shift, y))

    overlay = Image.new("RGBA", result.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    pulse = 90 + round(95 * (0.5 + 0.5 * math.sin(index * math.pi / 4)))
    scan_y = (index * 31) % SIZE
    draw.rectangle((0, scan_y, SIZE, scan_y + 2), fill=(255, 30, 75, 100))
    draw.ellipse((330, 84, 455, 209), outline=(255, 25, 65, pulse), width=3)
    for _ in range(16):
        x = rng.randrange(285, 485)
        y = rng.randrange(70, 235)
        w = rng.randrange(3, 15)
        draw.rectangle((x, y, x + w, y + rng.randrange(1, 4)), fill=(255, 25, 70, rng.randrange(70, 170)))
    return composite_glow(result, overlay, 4.0)


def drone_effect(frame: Image.Image, index: int) -> Image.Image:
    rng = random.Random(6200 + index)
    overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    pulse = 105 + round(110 * (0.5 + 0.5 * math.sin(index * math.pi / 3)))
    core = (256, 245)
    draw.ellipse((230, 219, 282, 271), outline=(255, 40, 225, pulse), width=5)
    draw.line((core[0] - 11, core[1] + 15, 104, SIZE), fill=(255, 45, 225, pulse), width=3)
    draw.line((core[0] + 11, core[1] + 15, 408, SIZE), fill=(255, 45, 225, pulse), width=3)
    for start in ((166, 254), (346, 254)):
        points = [start]
        x, y = start
        for step in range(7):
            x += rng.choice((-11, -4, 5, 12))
            y += rng.randrange(9, 18)
            points.append((x, y))
        draw.line(points, fill=(55, 225, 255, 210), width=3)
    return composite_glow(frame, overlay, 6.0)


def riot_effect(frame: Image.Image, index: int) -> Image.Image:
    rng = random.Random(8300 + index)
    overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    pulse = 80 + round(125 * (0.5 + 0.5 * math.sin(index * math.pi / 4)))
    # Shield pulse.
    draw.rounded_rectangle((367, 184, 462, 413), radius=12, outline=(55, 220, 255, pulse), width=4)
    # Baton and shield arcs.
    for start in ((148, 337), (410, 225), (446, 304)):
        points = [start]
        x, y = start
        for _ in range(6):
            x += rng.randrange(-9, 10)
            y += rng.randrange(8, 17)
            points.append((x, y))
        draw.line(points, fill=(50, 220, 255, 190), width=3)
    return composite_glow(frame, overlay, 5.0)


def assassin_effect(frame: Image.Image, index: int) -> Image.Image:
    rng = random.Random(9500 + index)
    phase = 2 * math.pi * index / FRAMES
    pulse = 100 + round(120 * (0.5 + 0.5 * math.sin(phase * 2)))

    # A brief chromatic afterimage sells the high-speed idle stance.
    if index % 6 in (0, 1):
        red = Image.new("RGB", frame.size, "black")
        red.paste(frame, (5, 0))
        frame = Image.blend(frame, ImageChops.screen(frame, red), 0.16)

    overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.ellipse((76, 43, 255, 222), outline=(30, 220, 255, pulse), width=4)
    draw.line((344, 296, 511, 398), fill=(255, 35, 45, pulse), width=7)
    for _ in range(12):
        x = rng.randrange(50, 360)
        y = rng.randrange(35, 300)
        draw.rectangle((x, y, x + rng.randrange(3, 16), y + 2), fill=(20, 220, 255, rng.randrange(60, 150)))
    return composite_glow(frame, overlay, 5.0)


def save_animation(source_name: str, output_name: str, effect, bob: float, zoom: float) -> None:
    source = Image.open(ENEMY_DIR / source_name).convert("RGB")
    rendered: list[Image.Image] = []
    for index in range(FRAMES):
        frame = fit_frame(source, index, bob=bob, zoom=zoom)
        rendered.append(effect(frame, index))

    palette = rendered[0].quantize(colors=128, method=Image.Quantize.MEDIANCUT)
    frames = [frame.quantize(palette=palette, dither=Image.Dither.FLOYDSTEINBERG) for frame in rendered]
    frames[0].save(
        ENEMY_DIR / output_name,
        save_all=True,
        append_images=frames[1:],
        duration=FRAME_MS,
        loop=0,
        optimize=True,
        disposal=2,
    )


def main() -> None:
    save_animation("enemy-night-hacker.png", "enemy-night-hacker.gif", hacker_effect, bob=1.5, zoom=0.006)
    save_animation("enemy-night-drone.png", "enemy-night-drone.gif", drone_effect, bob=5.0, zoom=0.004)
    save_animation("enemy-night-riot-trooper.png", "enemy-night-riot-trooper.gif", riot_effect, bob=1.2, zoom=0.004)
    save_animation("enemy-night-assassin.png", "enemy-night-assassin.gif", assassin_effect, bob=2.5, zoom=0.008)


if __name__ == "__main__":
    main()
