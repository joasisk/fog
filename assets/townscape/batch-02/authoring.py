"""SVG authoring helpers shared by the Batch 2 architecture and landscape."""
import random
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1] / "batch-01"))
from export import INK, SVG, ellipse, export_asset, path, raster, rect  # noqa: E402

ROOT = Path(__file__).resolve().parent
F = 72
REBUILD = False

# Pixel dimensions in the SVG viewBox are virtual units at the near plane.
def uv(point, frame):
    return [p / d for p, d in zip(point, frame)]


def clip(groups, shape, content):
    return (f'<defs><clipPath id="clip-{groups}">{path(shape, "white")}</clipPath></defs>'
            f'<g clip-path="url(#clip-{groups})">{content}</g>')


def pigment(seed, bounds, colors, count, spread=1):
    rng = random.Random(seed)
    marks = []
    x0, y0, x1, y1 = bounds
    for i in range(count):
        x, y = rng.uniform(x0, x1), rng.uniform(y0, y1)
        r = rng.uniform(.16, 1.25) * spread
        if i % 12 == 0:
            r *= 4.5
        ry = r * rng.uniform(.17, .75)
        paint = rng.choice(colors)
        alpha = rng.uniform(.07, .24) if i % 12 else rng.uniform(.07, .14)
        marks.append(ellipse(f"{x:.2f}", f"{y:.2f}", f"{r:.2f}", f"{ry:.2f}", paint, f"{alpha:.3f}"))
    return "\n".join(marks)


def wash(key, shape, base, bounds, colors, seed, count=220, spread=1):
    return path(shape, base) + clip(key, shape, pigment(seed, bounds, colors, count, spread))


def linear_gradient(key, color_a, color_b):
    return (f'<defs><linearGradient id="{key}" x1="0" y1="0" x2=".55" y2="1">'
            f'<stop stop-color="{color_a}"/><stop offset="1" stop-color="{color_b}"/>'
            '</linearGradient></defs>')


def masonry(bounds, spacing, tone, seed, alpha=.42):
    x0, y0, x1, y1 = bounds
    step_x, step_y = spacing
    rng = random.Random(seed)
    marks = []
    for row, y in enumerate(range(y0, y1, step_y)):
        bend = rng.uniform(-.8, .8)
        marks.append(path(f"M{x0} {y}Q{(x0+x1)/2} {y+bend:.2f} {x1} {y}",
                          "none", tone, .43, alpha))
        for x in range(x0 - row % 2 * (step_x//2), x1, step_x):
            x += rng.uniform(-.9, .9)
            lean = rng.uniform(-.8, .8)
            marks.append(path(f"M{x:.2f} {y}l{lean:.2f} {step_y}",
                              "none", tone, .42, alpha))
    return "\n".join(marks)


def label(x, y, message, size=3.7, color="#efe0bc", spacing=.8):
    return (f'<text x="{x}" y="{y}" text-anchor="middle" font-family="DejaVu Sans" '
            f'font-weight="bold" font-size="{size}" letter-spacing="{spacing}" fill="{color}">{message}</text>')


def svg(filename, frame, layers, scale=2, hidden=()):
    output = ROOT / "sources" / f"{filename}.svg"
    if not REBUILD and output.is_file():
        return
    width, height = frame
    content = []
    for name, art in layers.items():
        hide = name.startswith(("mask-", "end-")) or name in {"wet", "light"} or name in hidden
        style = ' style="display:none"' if hide else ""
        content.append(f'<g id="{name}" inkscape:groupmode="layer" inkscape:label="{name}"{style}>\n{art}\n</g>')
    output.write_text(
        f'<svg xmlns="{SVG}" xmlns:inkscape="{INK}" width="{width*scale}" height="{height*scale}" '
        f'viewBox="0 0 {width} {height}">\n' + "\n".join(content) + "\n</svg>\n")


def asset(name, family, style, frame, pivot, size, refs, layers, **fields):
    """Write an editable master and declare its untrimmed coordinate system."""
    svg(name, frame, layers)
    use_tags = fields.pop("use_tags", [family])
    has_ground = "footprint_f" in fields
    if not has_ground and family not in ("mist", "component"):
        span, depth = size[0] / F, fields.pop("depth_f", .5)
        fields["footprint_f"] = [[-span/2, 0], [span/2, 0], [span/2, depth], [-span/2, depth]]
    return {
        "asset_id": f"townscape.b02.{name}",
        "version": 1,
        "family": family,
        "style_family": style,
        "tags": [family, style, *use_tags],
        "use_tags": use_tags,
        "source": f"sources/{name}.svg",
        "reference_ids": refs,
        "provenance": "original / CC0-1.0",
        "source_dimensions_px": [2*d for d in frame],
        "pivot_uv": uv(pivot, frame),
        "reference_frontage_px": F,
        "authored_scale": 2,
        "world_width_f": size[0]/F,
        "world_height_f": size[1]/F,
        "alpha": "straight",
        "color_space": "srgb",
        "mask_color_space": "linear",
        "can_mirror": False,
        **fields,
    }
