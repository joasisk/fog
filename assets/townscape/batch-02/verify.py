"""Verify the exported asset contract and the browser's resolved review renders."""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageChops

from authoring import ROOT
from produce import FIXTURE, read_records


def check(condition, message):
    if not condition:
        raise AssertionError(message)


def open_art(record, directory, label):
    with Image.open(directory / record["files"][label]) as image:
        return image.copy()


def verify_art(records):
    hulls = set()
    for key, (asset, directory) in records.items():
        frame = tuple(asset["source_dimensions_px"])
        size = Image.new("L", frame)
        check((directory / asset["source"]).is_file() and asset["authored_scale"] == 2, f"{key}: missing 2× master")
        for part, url in asset["files"].items():
            filename = Path(url)
            check(not filename.is_absolute() and ".." not in filename.parts, f"{key}: layer path escapes manifest")
            pixels = open_art(asset, directory, part)
            mask = part.startswith("mask-")
            check(pixels.size == frame and pixels.mode == ("L" if mask else "RGBA"), f"{key} / {part}: wrong frame or format")
            check(("srgb" in pixels.info) != mask, f"{key} / {part}: wrong color encoding")
            alpha = pixels if mask else pixels.getchannel("A")
            check(alpha.getbbox(), f"{key} / {part}: empty art")
            size = ImageChops.lighter(size, alpha)
        l, t, r, b = size.getbbox()
        check([l, t, r-l, b-t] == asset["trim_rect_px"], f"{key}: crop has drifted")
        min_margin = 12 if asset["family"] in ("mist", "weather") else 8
        check(min(l, t, frame[0]-r, frame[1]-b) >= min_margin, f"{key}: insufficient padding")
        if asset["family"] == "shell":
            wall = open_art(asset, directory, "mask-wall")
            paint = open_art(asset, directory, "wall").getchannel("A")
            delta = ImageChops.difference(wall, paint)
            check(sum(delta.histogram()[22:]) <= 10, f"{key}: wall mask drift")
            silhouette = open_art(asset, directory, "mask-occlusion")
            fingerprint = silhouette.crop(silhouette.getbbox()).resize((128, 128)).tobytes()
            check(fingerprint not in hulls, f"{key}: duplicate shell silhouette")
            hulls.add(fingerprint)
            if "mask-entrance" in asset["files"]:
                x, y = [round(u*d) for u, d in zip(asset["entrance"]["threshold_uv"], frame)]
                check(open_art(asset, directory, "mask-entrance").getpixel((x, y-1)) == 255,
                      f"{key}: entrance mask misses threshold")
        if "light" in asset["files"]:
            light = open_art(asset, directory, "light").getchannel("A")
            aperture = open_art(asset, directory, "mask-aperture")
            check(not ImageChops.subtract(light, aperture).getbbox(), f"{key}: light escapes glass")
        if "mask-wetness" in asset["files"]:
            wetness = open_art(asset, directory, "mask-wetness")
            silhouette_name = "mask-coverage" if asset["family"] == "street" else "mask-support"
            silhouette = open_art(asset, directory, silhouette_name)
            check(not ImageChops.subtract(wetness, silhouette).getbbox(), f"{key}: wetness escapes support")
    check(len(hulls) == 14, "The two manifests must have 14 unique shell silhouettes")


def verify_public_access(records, fixture):
    items = fixture["items"]
    parcels = {item["id"]: item for item in items if "id" in item}
    bands = {band["id"]: band["scale"] for band in fixture["bands"]}

    def scale(item):
        return item.get("scale", bands[item["band"]])

    for prop in (item for item in items if "parcel" in item):
        parcel = parcels[prop["parcel"]]
        art, _ = records[prop["asset"]]
        ground, folder = records[parcel["asset"]]
        x, y = prop["pivot_px"]
        gx, gy = parcel["pivot_px"]
        q = scale(parcel)
        access_width = ground["entrance"]["clearance_f"]["width"] * 72 * q
        if art["family"] == "boundary":
            check(x == gx, f"{prop['asset']}: gate axis misses lot entrance")
            continue
        half_span = art["world_width_f"] * scale(prop) * 72/2
        check(abs(x-gx) - half_span >= access_width/2, f"{prop['asset']}: overlaps entry corridor")
        mask = open_art(ground, folder, "mask-support")
        anchor_x, anchor_y = [u*d for u, d in zip(ground["pivot_uv"], mask.size)]
        for point in [x-half_span*.92, x, x+half_span*.92]:
            local = (round(anchor_x+(point-gx)*2/q), round(anchor_y+(y-gy)*2/q))
            check(mask.getpixel(local) >= 252, f"{prop['asset']}: ground contact is outside parcel coverage")


def shop_wall_alpha(records, fixture, replacement):
    prefix = "townscape."
    left, shop, right = [next(b for b in fixture["buildings"] if b["id"] == item)
                         for item in ("near-gable-house", "shop-slot", "near-brick-infill")]
    far_ground = Image.new("L", tuple(fixture["viewport_px"]))
    for asset_id, begin in [(left["asset"], left["left_px"]), (prefix+replacement, shop["left_px"]), (right["asset"], right["left_px"])]:
        art, folder = records[asset_id]
        mask = open_art(art, folder, "mask-wall")
        x, y = [u*d for u, d in zip(art["ground_span_uv"][0], mask.size)]
        origin = (round(begin-x/2), round(737-y/2))
        mask = mask.resize((mask.width//2, mask.height//2), Image.Resampling.BOX)
        far_ground.paste(255, (*origin, origin[0]+mask.width, origin[1]+mask.height), mask)
    art, folder = records[shop["foundation"]]
    mask = open_art(art, folder, "mask-support")
    x, y = [u*d for u, d in zip(art["pivot_uv"], mask.size)]
    ox, oy = round(469-x/2), round(737-y/2)
    far_ground.paste(255, (ox, oy, ox+mask.width//2, oy+mask.height//2),
                     mask.resize((mask.width//2, mask.height//2), Image.Resampling.BOX))
    for divisor in (1, 2):
        mask = far_ground.resize(tuple(x//divisor for x in far_ground.size), Image.Resampling.BOX)
        for x in (433, 505):
            seam = mask.crop((x//divisor-1, 670//divisor, x//divisor+1, 732//divisor))
            check(seam.getextrema() == (255, 255), f"{replacement}: gap at join x={x} scale 1/{divisor}")
        foot = mask.crop((435//divisor, 733//divisor, 503//divisor, 743//divisor))
        check(foot.getextrema() == (255, 255), f"{replacement}: exposed ground seam at scale 1/{divisor}")


def doubled_mask(art, folder, tree, layers):
    size = (960, 540)
    layer = Image.new("L", tuple(art["source_dimensions_px"]))
    for name in layers:
        layer = ImageChops.lighter(layer, open_art(art, folder, name))
    q = tree["scale"]/4
    x, y = [round(p/2-u*d*q) for p, u, d in zip(tree["pivot_px"], art["pivot_uv"], layer.size)]
    small = layer.resize((round(layer.width*q), round(layer.height*q)), Image.Resampling.BOX)
    output = Image.new("L", size)
    output.paste(small, (x, y))
    return output


def verify_previews(folder, records, fixture):
    def plate(name, width=960):
        height = 1080 if width==1920 else 540
        chosen = folder / f"hillside-{name}-{width}x{height}.png"
        with Image.open(chosen) as im:
            check(im.size == (width, height) and im.convert("RGBA").getchannel("A").getextrema() == (255, 255),
                  f"{chosen.name}: incorrect size or gap left by cropped compositing")
            return im.convert("RGB")
    plate("wet-mist", 1920)
    mist = plate("wet-mist")
    clear = plate("wet-clear")
    dry_mist = plate("dry-mist")
    dry_clear = plate("dry-clear")
    book = plate("bookshop")
    check(ImageChops.difference(mist, clear).getbbox() and ImageChops.difference(clear, dry_clear).getbbox(),
          "Wet and mist layers must be independently visible")
    sx, sy, rx, by = ImageChops.difference(mist, book).getbbox()
    check(sx >= 214 and rx <= 255 and sy >= 312 and by <= 372, "Shop replacement changed other scene pixels")
    changed = ImageChops.difference(dry_mist, dry_clear).convert("L")
    check(changed.crop((40, 206, 185, 258)).getbbox() and changed.crop((350, 276, 490, 328)).getbbox(),
          "Mist must reach visible pixels in both gaps")
    tree = next(item for item in fixture["items"] if item.get("id") == "overlook-oak")
    art, directory = records[tree["asset"]]
    front = doubled_mask(art, directory, tree, ["mask-front-canopy", "mask-trunk"])
    rear = doubled_mask(art, directory, tree, ["mask-rear-canopy"])
    front_count = untouched = screened = 0
    for f, r, d in zip(front.tobytes(), rear.tobytes(), changed.tobytes()):
        if f >= 251:
            front_count += 1
            untouched += d <= 1
        if f <= 2 and r >= 251 and d >= 2:
            screened += 1
    check(front_count > 500 and untouched / front_count > .94 and screened > 35,
          f"Depth split changed {front_count-untouched} of {front_count} front pixels and screened {screened} rear pixels")
    plate("routes")


def main():
    options = argparse.ArgumentParser(description=__doc__)
    options.add_argument("--previews", default=ROOT / "preview", type=Path)
    args = options.parse_args()
    records = {**read_records(ROOT.parent / "batch-01"), **read_records(ROOT)}
    fixture = json.loads(FIXTURE.read_text())
    verify_art(records)
    verify_public_access(records, fixture)
    for shell in ("b01.cafe", "b01.bookshop"):
        shop_wall_alpha(records, fixture, shell)
    verify_previews(args.previews, records, fixture)
    print("Batch 2 verified: 14 unique shells, registered PNGs and masks, clear public lots, both shop seams and split mist at both display sizes.")


if __name__ == "__main__":
    main()
