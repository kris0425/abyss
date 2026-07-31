from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
PLAYER_DIR = ROOT / "assets" / "players"
SIZE = 512
FRAMES = 18
FRAME_MS = 85


def fit_frame(source: Image.Image, frame_index: int, bob: float, zoom: float) -> Image.Image:
    phase = 2 * math.pi * frame_index / FRAMES
    scale = 1.025 + zoom * (0.5 + 0.5 * math.sin(phase))
    side = round(SIZE * scale)
    image = source.resize((side, side), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (SIZE, SIZE), "black")
    canvas.paste(image, ((SIZE - side) // 2, (SIZE - side) // 2 + round(bob * math.sin(phase))))
    return canvas


def composite_glow(frame: Image.Image, layer: Image.Image, radius: float = 5.0) -> Image.Image:
    glow = layer.filter(ImageFilter.GaussianBlur(radius))
    frame = Image.alpha_composite(frame.convert("RGBA"), glow)
    return Image.alpha_composite(frame, layer).convert("RGB")


def blade_effect(frame: Image.Image, index: int) -> Image.Image:
    rng = random.Random(1100 + index)
    phase = 2 * math.pi * index / FRAMES
    overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    pulse = 75 + round(150 * (0.5 + 0.5 * math.sin(phase * 2)))
    draw.line((48, 427, 191, 282), fill=(255, 235, 180, pulse), width=4)
    gleam = (index * 9) % 125
    gx = 48 + gleam
    gy = 427 - gleam
    draw.line((gx - 13, gy, gx + 13, gy), fill=(255, 250, 215, 210), width=2)
    draw.line((gx, gy - 13, gx, gy + 13), fill=(255, 250, 215, 210), width=2)
    for _ in range(9):
        x = rng.randrange(35, 478)
        y = rng.randrange(45, 420)
        draw.ellipse((x, y, x + 2, y + 2), fill=(255, 155, 55, rng.randrange(65, 155)))
    return composite_glow(frame, overlay, 4.0)


def spark_effect(frame: Image.Image, index: int) -> Image.Image:
    rng = random.Random(2200 + index)
    phase = 2 * math.pi * index / FRAMES
    overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    pulse = 90 + round(130 * (0.5 + 0.5 * math.sin(phase * 2)))
    radius = 52 + round(5 * math.sin(phase * 2))
    center = (383, 133)
    draw.ellipse((center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius), outline=(185, 80, 255, pulse), width=5)
    draw.ellipse((63, 76, 148, 166), outline=(150, 65, 255, pulse), width=4)
    for _ in range(14):
        angle = rng.random() * math.tau
        distance = rng.randrange(45, 90)
        x = center[0] + round(math.cos(angle) * distance)
        y = center[1] + round(math.sin(angle) * distance)
        draw.ellipse((x, y, x + 3, y + 3), fill=(205, 120, 255, rng.randrange(85, 205)))
    return composite_glow(frame, overlay, 6.0)


def rat_effect(frame: Image.Image, index: int) -> Image.Image:
    rng = random.Random(3300 + index)
    phase = 2 * math.pi * index / FRAMES
    overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    pulse = 90 + round(135 * (0.5 + 0.5 * math.sin(phase * 2)))
    coin_y = 61 + round(8 * math.sin(phase))
    coin_width = max(3, round(15 * abs(math.cos(phase))))
    draw.ellipse((173 - coin_width, coin_y - 15, 173 + coin_width, coin_y + 15), outline=(255, 205, 55, pulse), width=4)
    draw.line((344, 340, 424, 301), fill=(255, 245, 190, pulse), width=4)
    for _ in range(10):
        x = rng.randrange(115, 246)
        y = rng.randrange(35, 150)
        draw.ellipse((x, y, x + 3, y + 3), fill=(255, 205, 50, rng.randrange(70, 185)))
    draw.arc((128, 18, 218, 107), index * 20, index * 20 + 90, fill=(60, 220, 115, 150), width=3)
    return composite_glow(frame, overlay, 5.0)


def ranger_effect(frame: Image.Image, index: int) -> Image.Image:
    rng = random.Random(4400 + index)
    phase = 2 * math.pi * index / FRAMES
    overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    pulse = 85 + round(140 * (0.5 + 0.5 * math.sin(phase * 2)))
    center = (373, 198)
    radius = 50 + round(7 * math.sin(phase))
    draw.arc((center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius), index * 18, index * 18 + 255, fill=(55, 245, 180, pulse), width=4)
    draw.line((222, 197, 439, 197), fill=(100, 255, 210, pulse), width=4)
    for _ in range(11):
        x = rng.randrange(35, 475)
        y = rng.randrange(45, 450)
        length = rng.randrange(5, 15)
        draw.arc((x, y, x + length, y + length // 2 + 3), 0, 180, fill=(90, 220, 125, rng.randrange(60, 160)), width=2)
    return composite_glow(frame, overlay, 5.0)


def save_animation(source_name: str, output_name: str, effect, bob: float, zoom: float) -> None:
    source = Image.open(PLAYER_DIR / source_name).convert("RGB")
    rendered = []
    for index in range(FRAMES):
        frame = fit_frame(source, index, bob=bob, zoom=zoom)
        rendered.append(effect(frame, index))

    palette = rendered[0].quantize(colors=128, method=Image.Quantize.MEDIANCUT)
    frames = [frame.quantize(palette=palette, dither=Image.Dither.FLOYDSTEINBERG) for frame in rendered]
    frames[0].save(
        PLAYER_DIR / output_name,
        save_all=True,
        append_images=frames[1:],
        duration=FRAME_MS,
        loop=0,
        optimize=True,
        disposal=2,
    )


def main() -> None:
    save_animation("player-blade.png", "player-blade.gif", blade_effect, bob=1.5, zoom=0.005)
    save_animation("player-spark.png", "player-spark.gif", spark_effect, bob=2.0, zoom=0.006)
    save_animation("player-rat.png", "player-rat.gif", rat_effect, bob=2.2, zoom=0.006)
    save_animation("player-ranger.png", "player-ranger.gif", ranger_effect, bob=2.5, zoom=0.006)


if __name__ == "__main__":
    main()
