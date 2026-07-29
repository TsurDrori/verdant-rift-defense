#!/usr/bin/env python3
"""Convert generated 4x3 chroma-key grids into normalized 12-frame strips.

Every frame shares one scale and a bottom-center anchor. This deliberately
preserves pose size differences while removing unequal generator padding.
"""

from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ATLASES = (
    ("tmp/generated-animation-atlases/keyed/kael-12.png", "public/assets/heroes/animation/expanded/kael-actions-12.png"),
    ("tmp/generated-animation-atlases/keyed/lyra-12.png", "public/assets/heroes/animation/expanded/lyra-actions-12.png"),
    ("tmp/generated-animation-atlases/keyed/aegis-defender-12.png", "public/assets/units/expanded/aegis-defender-12.png"),
    ("tmp/generated-animation-atlases/keyed/skitter-12.png", "public/assets/enemies/animation/expanded/skitter-actions-12.png"),
    ("tmp/generated-animation-atlases/keyed/marauder-12.png", "public/assets/enemies/animation/expanded/marauder-actions-12.png"),
    ("tmp/generated-animation-atlases/keyed/brute-12.png", "public/assets/enemies/animation/expanded/brute-actions-12.png"),
    ("tmp/generated-animation-atlases/keyed/wisp-12.png", "public/assets/enemies/animation/expanded/wisp-actions-12.png"),
    ("tmp/generated-animation-atlases/keyed/bloomlord-12.png", "public/assets/enemies/animation/expanded/bloomlord-actions-12.png"),
)


def split_grid(source: Image.Image) -> list[Image.Image]:
    frames: list[Image.Image] = []
    for row in range(3):
        top = round(row * source.height / 3)
        bottom = round((row + 1) * source.height / 3)
        for column in range(4):
            left = round(column * source.width / 4)
            right = round((column + 1) * source.width / 4)
            frames.append(source.crop((left, top, right, bottom)))
    return frames


def opaque_bounds(frame: Image.Image) -> tuple[int, int, int, int]:
    # Ignore a nearly transparent antialias haze when calculating anchors.
    mask = frame.getchannel("A").point(lambda alpha: 255 if alpha >= 20 else 0)
    bound = mask.getbbox()
    if bound is None:
        raise ValueError("generated atlas contains an empty frame")
    return bound


def normalize(source_name: str, output_name: str) -> None:
    source = Image.open(ROOT / source_name).convert("RGBA")
    frames = split_grid(source)
    bounds = [opaque_bounds(frame) for frame in frames]
    content_width = max(right - left for left, _top, right, _bottom in bounds)
    content_height = max(bottom - top for _left, top, _right, bottom in bounds)
    side_padding = max(8, round(content_width * 0.055))
    top_padding = max(8, round(content_height * 0.055))
    bottom_padding = max(5, round(content_height * 0.028))
    cell_width = content_width + side_padding * 2
    cell_height = content_height + top_padding + bottom_padding
    strip = Image.new("RGBA", (cell_width * len(frames), cell_height), (0, 0, 0, 0))

    for index, (frame, bound) in enumerate(zip(frames, bounds)):
        content = frame.crop(bound)
        x = index * cell_width + (cell_width - content.width) // 2
        y = cell_height - bottom_padding - content.height
        strip.alpha_composite(content, (x, y))

    output = ROOT / output_name
    output.parent.mkdir(parents=True, exist_ok=True)
    strip.save(output, optimize=True)

    # Shipping checks: transparent outer corners and meaningful occupancy in
    # every slot. These catch failed key removal and bad grid segmentation.
    if any(strip.getpixel(point)[3] != 0 for point in ((0, 0), (strip.width - 1, 0), (0, strip.height - 1), (strip.width - 1, strip.height - 1))):
        raise ValueError(f"{output_name} has opaque outer corners")
    for index in range(12):
        cell = strip.crop((index * cell_width, 0, (index + 1) * cell_width, cell_height))
        if cell.getchannel("A").getbbox() is None:
            raise ValueError(f"{output_name} frame {index} is empty")

    print(f"{output_name}: {strip.width}x{strip.height}, frame={cell_width}x{cell_height}, count=12")


for source_name, output_name in ATLASES:
    normalize(source_name, output_name)
