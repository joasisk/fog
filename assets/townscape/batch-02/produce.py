"""Export Batch 2 editable masters and render the display-size asset inventory."""
import argparse
import json
import math
from concurrent.futures import ThreadPoolExecutor

from PIL import Image, ImageChops, ImageDraw, ImageFont
from PIL.PngImagePlugin import PngInfo

import authoring
from authoring import ROOT, export_asset
from backdrop import backdrop
from buildings import buildings
from landscape import landscape

BATCH_1 = ROOT.parent / "batch-01"
FIXTURE = ROOT / "hillside.v1.json"
VERSION = ROOT / "manifest.v1.json"
SRGB = PngInfo()
SRGB.add(b"sRGB", b"\0")


def save_json(filepath, data):
    filepath.write_text(json.dumps(data, indent=2) + "\n")


def export(record):
    source = ROOT / record["source"]
    destination = ROOT / "png" / source.stem
    destination.mkdir(parents=True, exist_ok=True)
    files = export_asset(source, destination)
    mask = Image.new("L", record["source_dimensions_px"])
    for name, url in files.items():
        with Image.open(ROOT / url) as image:
            coverage = image if name.startswith("mask-") else image.getchannel("A")
            if coverage.size != mask.size or not coverage.getbbox():
                raise ValueError(f"{record['asset_id']} / {name}: empty or misregistered")
            mask = ImageChops.lighter(mask, coverage)
    box = mask.getbbox()
    if not box:
        raise ValueError(f"{record['asset_id']}: empty source")
    l, t, r, b = box
    return {
        **record,
        "trim_rect_px": [l, t, r-l, b-t],
        "files": files,
        "layer_order": [name for name in files if not name.startswith(("mask-", "end-")) and name not in ("wet", "light")],
        "states": ["base"] + [label for label in ("wet", "light") if label in files],
    }


def read_records(directory):
    return {asset["asset_id"]: (asset, directory) for asset in json.loads(
        (directory / "manifest.v1.json").read_text())["assets"]}


def draw_art(key, records, lit=False, ends=False):
    record, directory = records[key]
    frame = record["source_dimensions_px"]
    canvas = Image.new("RGBA", frame)
    layers = record["layer_order"]
    if ends:
        layers = [name for name in ("end-left", "end-right") if name in record["files"]] + layers
    light_before = record.get("overlay_before", {}).get("light")
    for layer in layers:
        if lit and layer == light_before:
            with Image.open(directory / record["files"]["light"]) as glow:
                canvas.alpha_composite(glow)
        with Image.open(directory / record["files"][layer]) as png:
            canvas.alpha_composite(png)
    for mount in record.get("mounts", []):
        component, _ = records[mount["asset"]]
        artwork = draw_art(mount["asset"], records, lit and mount.get("light_group") == "ground")
        size = tuple(round(n * mount["scale"]) for n in artwork.size)
        p = record["sockets"][mount["socket"]]["uv"]
        inset = tuple(round(p[i]*frame[i] - component["pivot_uv"][i]*size[i]) for i in range(2))
        canvas.alpha_composite(artwork.resize(size, Image.Resampling.LANCZOS), inset)
    if lit and "wet" in record["files"]:
        with Image.open(directory / record["files"]["wet"]) as wet:
            canvas.alpha_composite(wet)
    return canvas


def contact(name, entries, records, columns, cell_width, panel_h, scale_mist=False):
    total_w = 48 + columns * cell_width
    total_h = 110 + 2 * panel_h * math.ceil(len(entries) / columns)
    sheet = Image.new("RGB", (total_w, total_h), "#e6deca")
    draw = ImageDraw.Draw(sheet)
    heading = ImageFont.truetype("DejaVuSerif.ttf", 29)
    body = ImageFont.truetype("DejaVuSans.ttf", 12)
    draw.text((24, 18), name, font=heading, fill="#363d32")
    draw.text((25, 56), "72 px per near-plane frontage unit", font=body, fill="#575a4d")
    for i, key in enumerate(entries):
        record, _ = records[key]
        label = key.rsplit(".", 1)[1].replace("-", " ").capitalize()
        column, row = i%columns, i//columns
        x, y = 24 + column*cell_width, 86 + row*2*panel_h
        for shade, palette in enumerate([("#cec4ac", "#3d473d"), ("#454d46", "#eae4d0")]):
            yy = y + shade*panel_h
            draw.rectangle((x, yy, x+cell_width-5, yy+panel_h-4), fill=palette[0])
            art = draw_art(key, records, lit=shade == 1)
            art = art.crop(art.getbbox())
            factor = .5
            if scale_mist and record["family"] in ("mist", "weather"):
                factor = min(factor, (cell_width-12)/art.width)
            art = art.resize(tuple(max(1, round(n*factor)) for n in art.size), Image.Resampling.LANCZOS)
            sheet.paste(art, (x+round((cell_width-5-art.width)/2), yy+panel_h-24-art.height), art)
            draw.text((x+9, yy+panel_h-20), label, font=body, fill=palette[1])
    sheet.save(ROOT / "preview" / ({"Shells": "shell-contact.png", "Terrain and details": "kit-contact.png"}[name]),
               pnginfo=SRGB)


def sheets():
    records = {**read_records(BATCH_1), **read_records(ROOT)}
    shells = [key for key, (spec, _) in records.items() if spec["family"] == "shell"]
    kit = [key for key, (spec, _) in records.items() if spec["family"] != "shell"]
    contact("Shells", shells, records, 7, 164, 169)
    contact("Terrain and details", kit, records, 4, 250, 144, scale_mist=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--redraw", action="store_true", help="replace the SVG masters from the brush recipes")
    args = parser.parse_args()
    authoring.REBUILD = args.redraw
    for folder in ("sources", "preview", "png/landscape"):
        (ROOT / folder).mkdir(parents=True, exist_ok=True)
    fixture = json.loads(FIXTURE.read_text())
    backdrop(fixture)
    records = [*buildings(), *landscape()]
    with ThreadPoolExecutor(max_workers=7) as pool:
        plate = pool.submit(export_asset, ROOT / "sources" / "landscape.svg", ROOT / "png" / "landscape")
        layers = list(pool.map(export, records))
        plate.result()
    save_json(VERSION, {
        "schema_version": 1, "pack_version": "1.0.0",
        "includes": ["../batch-01/manifest.v1.json"],
        "units": json.loads((BATCH_1 / "manifest.v1.json").read_text())["units"],
        "assets": layers,
    })
    sheets()
    print(f"Exported {len(layers)} Batch 2 assets and {len(layers) + len(read_records(BATCH_1))} total records.")
    print("Display-size shell and component contact sheets written.")


if __name__ == "__main__":
    main()
