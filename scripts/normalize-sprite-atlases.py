#!/usr/bin/env python3
"""Trim transparent padding from action atlases while preserving shared anchors."""

from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ATLASES = (
    ("public/assets/units/aegis-defender.png", 334, "public/assets/units/normalized/aegis-defender.png"),
    ("public/assets/heroes/animation/kael-actions.png", 334, "public/assets/heroes/animation/normalized/kael-actions.png"),
    ("public/assets/heroes/animation/lyra-actions.png", 404, "public/assets/heroes/animation/normalized/lyra-actions.png"),
    ("public/assets/enemies/animation/skitter-actions.png", 434, "public/assets/enemies/animation/normalized/skitter-actions.png"),
    ("public/assets/enemies/animation/marauder-actions.png", 396, "public/assets/enemies/animation/normalized/marauder-actions.png"),
    ("public/assets/enemies/animation/wisp-actions.png", 396, "public/assets/enemies/animation/normalized/wisp-actions.png"),
    ("public/assets/enemies/animation/brute-actions.png", 396, "public/assets/enemies/animation/normalized/brute-actions.png"),
    ("public/assets/enemies/animation/bloomlord-actions.png", 396, "public/assets/enemies/animation/normalized/bloomlord-actions.png"),
)


def normalize(source_name: str, source_width: int, output_name: str) -> None:
    source = Image.open(ROOT / source_name).convert("RGBA")
    frame_count = source.width // source_width
    frames = [source.crop((index * source_width, 0, (index + 1) * source_width, source.height)) for index in range(frame_count)]
    bounds = [frame.getchannel("A").getbbox() for frame in frames]
    if any(bound is None for bound in bounds):
        raise ValueError(f"{source_name} contains an empty frame")
    opaque_bounds = [bound for bound in bounds if bound is not None]
    content_width = max(right - left for left, _top, right, _bottom in opaque_bounds)
    content_height = max(bottom - top for _left, top, _right, bottom in opaque_bounds)
    side_padding = max(6, round(content_width * 0.045))
    top_padding = max(6, round(content_height * 0.045))
    bottom_padding = max(4, round(content_height * 0.025))
    cell_width = content_width + side_padding * 2
    cell_height = content_height + top_padding + bottom_padding
    atlas = Image.new("RGBA", (cell_width * frame_count, cell_height), (0, 0, 0, 0))
    for index, (frame, bound) in enumerate(zip(frames, opaque_bounds)):
        left, top, right, bottom = bound
        content = frame.crop(bound)
        x = index * cell_width + (cell_width - content.width) // 2
        y = cell_height - bottom_padding - content.height
        atlas.alpha_composite(content, (x, y))
    output = ROOT / output_name
    output.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(output, optimize=True)
    print(f"{output_name}: {atlas.width}x{atlas.height}, frame={cell_width}x{cell_height}, count={frame_count}")


for source_name, source_width, output_name in ATLASES:
    normalize(source_name, source_width, output_name)
