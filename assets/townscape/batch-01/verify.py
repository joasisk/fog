"""Verify Batch 1 source frames, masks, motion and the shared frontage fixture."""
import json
from pathlib import Path

from PIL import Image, ImageChops

from export import ROOT, compose, load

manifest = json.loads((ROOT / "manifest.v1.json").read_text())
fixture = json.loads((ROOT / "calibration.v1.json").read_text())
assets = {item["asset_id"].split(".")[-1]: item for item in manifest["assets"]}
placements = {item["id"]: item for item in fixture["placement"]}


def check(condition, description):
    if not condition:
        raise AssertionError(description)


def pixels(asset, uv):
    return [round(v*d) for v, d in zip(uv, asset["source_dimensions_px"])]


def screen(asset, placement, uv):
    return [round(origin + (value - pivot)*extent * placement["scale"] / 2, 8)
            for origin, value, pivot, extent in zip(placement["pivot_px"], uv, asset["pivot_uv"],
                                                    asset["source_dimensions_px"])]


for name, asset in assets.items():
    dimensions = tuple(asset["source_dimensions_px"])
    combined = Image.new("L", dimensions)
    files = asset["files"]
    check((ROOT / asset["source"]).is_file(), f"{name}: missing master")
    for label, filename in files.items():
        check(not Path(filename).is_absolute(), f"{name}: {label} must resolve relative to the manifest")
        layer = load(asset, label)
        is_mask = label.startswith("mask-")
        check(layer.size == dimensions, f"{name}: {label} frame {layer.size} versus {dimensions}")
        check(layer.mode == ("L" if is_mask else "RGBA"), f"{name}: {label} sample mode")
        check(("srgb" in layer.info) != is_mask, f"{name}: {label} color tagging")
        alpha = layer if is_mask else layer.getchannel("A")
        check(alpha.getbbox(), f"{name}: {label} is empty")
        combined = ImageChops.lighter(combined, alpha)
    left, top, right, bottom = combined.getbbox()
    check([left, top, right-left, bottom-top] == asset["trim_rect_px"], f"{name}: trim is out of sync")
    padding = 12 if name == "mist-sheet" else 8
    check(min(left, top, dimensions[0]-right, dimensions[1]-bottom) >= padding, f"{name}: trim padding")
    if asset["family"] == "shell":
        wall = load(asset, "mask-wall")
        check(ImageChops.difference(wall, load(asset, "wall").getchannel("A")).getextrema()[1] <= 13,
              f"{name}: wall mask differs from painted wall alpha")
        visible = compose(asset, include_shadow=False).getchannel("A")
        occlusion = load(asset, "mask-occlusion")
        delta = ImageChops.difference(visible, occlusion)
        check(sum(delta.histogram()[16:]) < 80, f"{name}: occlusion differs from painted silhouette")
        threshold = pixels(asset, asset["entrance"]["threshold_uv"])
        entrance = load(asset, asset["entrance"]["mask"])
        check(entrance.getpixel((threshold[0], threshold[1]-1)) == 255, f"{name}: missing threshold coverage")
    if name == "narrow-lane":
        wet = load(asset, "mask-wetness")
        coverage = load(asset, "mask-coverage")
        check(not ImageChops.subtract(wet, coverage).getbbox(), "Wetness extends outside the lane")
        left, right = [pixels(asset, asset["joins"][side]["uv"]) for side in ("start", "end")]
        check(coverage.getpixel(tuple(left)) == coverage.getpixel((right[0]-1, right[1])) == 255,
              "Lane join misses paving")


cafe = assets["cafe"]
bookshop = assets["bookshop"]
for key in ("source_dimensions_px", "pivot_uv", "footprint_f", "ground_span_uv",
            "wall_contacts", "foundation_modes", "entrance"):
    check(cafe[key] == bookshop[key], f"Attached fixture: {key} varies between candidates")

slot = placements["swap-slot"]
foundation_placement = placements[fixture["foundation_case"]]
foundation = assets[foundation_placement["asset"]]
foundation_span = [screen(foundation, foundation_placement, uv) for uv in foundation["top_span_uv"]]
route = fixture["entrance_route_px"]
for name in fixture["swap_candidates"]:
    asset = assets[name]
    envelope = fixture["reserved_envelopes"]["stepped"]
    check(asset["world_width_f"] == envelope["width_f"]
          and max(point[1] for point in asset["footprint_f"]) == envelope["depth_f"]
          and asset["world_height_f"] <= envelope["max_height_f"]
          and set(envelope["contacts"]) == set(asset["wall_contacts"])
          and envelope["foundation"] in asset["foundation_modes"],
          f"{name}: stepped envelope mismatch")
    wall = load(asset, "mask-wall")
    check(wall.getbbox() == (24, 86, 168, 232), f"{name}: incomplete shared wall span")
    for neighbor_id, side, other_side in [("left-neighbor", "left", "right"), ("right-neighbor", "right", "left")]:
        neighbor_pose = placements[neighbor_id]
        neighbor = assets[neighbor_pose["asset"]]
        contact, other_contact = asset["wall_contacts"][side], neighbor["wall_contacts"][other_side]
        check(contact["profile"] == other_contact["profile"], f"{name}: {side} profile is incompatible")
        check([screen(asset, slot, uv) for uv in contact["span_uv"]]
              == [screen(neighbor, neighbor_pose, uv) for uv in other_contact["span_uv"]],
              f"{name}: {side} join does not land on neighbor")
    span = [screen(asset, slot, uv) for uv in asset["ground_span_uv"]]
    check(span == foundation_span, f"{name}: no full-width contact on foundation")
    check(screen(asset, slot, asset["entrance"]["threshold_uv"]) == route[0],
          f"{name}: entrance does not meet the clearance route")
    lane_pose = placements["front-lane"]
    lane = assets[lane_pose["asset"]]
    left, right = [screen(lane, lane_pose, lane["joins"][side]["uv"]) for side in ("start", "end")]
    check(left[0] < route[-1][0] < right[0] and route[-1][1] == left[1] == right[1],
          f"{name}: entrance route ends away from the lane")

    # Build an isolated wall and support alpha proof at each delivery scale.
    full = Image.new("L", tuple(fixture["viewport_px"]))
    for item, art, layer in [(placements["left-neighbor"], bookshop, "mask-wall"),
                             (slot, asset, "mask-wall"),
                             (placements["right-neighbor"], cafe, "mask-wall"),
                             (foundation_placement, foundation, "mask-support")]:
        size = tuple(round(i*item["scale"]/2) for i in art["source_dimensions_px"])
        pos = tuple(round(p - u*i) for p, u, i in zip(item["pivot_px"], art["pivot_uv"], size))
        mask = load(art, layer).resize(size, Image.Resampling.BOX)
        full.paste(255, (*pos, pos[0]+size[0], pos[1]+size[1]), mask)
    for divisor in (1, 2):
        coverage = full.resize(tuple(d//divisor for d in full.size), Image.Resampling.BOX)
        for x in (622, 694):
            check(coverage.crop((x//divisor-1, 610//divisor, x//divisor+1, 642//divisor)).getextrema() == (255, 255),
                  f"{name}: exposed seam at x={x}, scale 1/{divisor}")
        check(coverage.crop((630//divisor, 642//divisor, 686//divisor, (649+divisor-1)//divisor)).getextrema()
              == (255, 255), f"{name}: shell-to-foundation gap at scale 1/{divisor}")


room = cafe["rooms"][0]
pane_masks = [load(cafe, room["panes"][name]["clip_mask"]) for name in room["pane_order"]]
check(not ImageChops.multiply(*pane_masks).getbbox(), "Café panes overlap")
pane_union = ImageChops.lighter(*pane_masks)
motion_coverage = Image.new("L", pane_union.size)
frames = []
for label in room["motion"]["frames"]:
    motion = load(cafe, label).getchannel("A")
    check(not ImageChops.subtract(motion, pane_union).getbbox(), f"{label}: motion escapes glazing")
    motion_coverage = ImageChops.lighter(motion_coverage, motion)
    frames.append(compose(cafe, motion=label).tobytes())
check(all(ImageChops.multiply(mask, motion_coverage).getbbox() for mask in pane_masks),
      "Café animation should cross both panes")
check(len(set(frames)) == len(frames), "Café animation contains duplicate frames")
check(room["motion"]["loop"], "Café motion must loop")

for w, h in [fixture["viewport_px"], fixture["reduced_viewport_px"]]:
    plates = [Image.open(ROOT / "preview" / f"slope-{name}-{w}x{h}.png") for name in fixture["swap_candidates"]]
    try:
        check(all(im.size == (w, h) for im in plates), f"Incorrect preview size {w}x{h}")
        x0, y0, x1, y1 = ImageChops.difference(*plates).getbbox()
        scale = w / fixture["viewport_px"][0]
        check(x0 >= 622*scale-3 and x1 <= 694*scale+3 and y0 >= 530*scale and y1 <= 646*scale+3,
              f"Preview swap altered pixels outside the slot at {w}x{h}")
    finally:
        for im in plates:
            im.close()

print("Batch 1 verified: frames, color and masks, shared walls, support and entrance, eight motion frames, both preview sizes.")
