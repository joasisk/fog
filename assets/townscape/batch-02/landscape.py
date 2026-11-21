"""Reusable ground treatments, street pieces, furniture and weather."""
import math
import random

from authoring import asset, clip, ellipse, masonry, path, pigment, rect, uv, wash

TERRACE = ["REF-L05", "REF-L10"]
GARDEN = ["REF-T03", "REF-S09"]
CIVIC = ["REF-T01", "REF-S05"]


def joins(frame, positions, profile):
    return {name: {"uv": uv(point, frame), "profile": profile} for name, point in positions.items()}


def lanes():
    bend = (120, 50)
    junction = (124, 55)
    bend_path = "M12 12H38Q60 12 80 26Q90 33 108 30V38Q90 41 78 34Q59 20 38 20H12Z"
    junction_path = "M12 13H112V21H87Q82 21 78 26L75 43 67 41 70 27Q70 21 62 21H12Z"
    for name, frame, shape, anchors, route, seed in [
        ("lane-bend", bend, bend_path, {"start": (12, 16), "end": (108, 34)},
         [(12, 16), (38, 16), (60, 21), (80, 30), (96, 34), (108, 34)], 31),
        ("lane-junction", junction, junction_path, {"start": (12, 17), "end": (112, 17), "branch": (71, 42)},
         [(12, 17), (62, 17), (80, 17), (112, 17)], 36),
    ]:
        wet = "M18 14l21 .2 5 1.5H20Z M49 15l10 2 16 2-17 1.4z M88 15h19l-2 2H87z"
        if name == "lane-bend":
            wet = "M17 15h20l6 .9-26 1zM47 16q16 3 28 12l-6-1Q55 20 47 18zM87 32l11 1 6-1v2H93z"
        yield asset(name, "street", "wet_gravel", frame, anchors["start"], (96 if name=="lane-bend" else 100, 8),
                    TERRACE, {
                        "paving": wash("lane", shape, "#9a8f7e", (11, 11, frame[0]-11, frame[1]-9),
                                       ["#504e46", "#dfc9aa", "#80776b"], seed, 425),
                        "wet": clip("wet", shape, path(wet, "#e6dfc9", opacity=.62)),
                        "mask-coverage": path(shape, "white"),
                        "mask-wetness": clip("wet-coverage", shape, path(wet, "white", opacity=.72)),
                    }, depth_f=.5, allowed_slope_deg=[-14, 14] if name=="lane-bend" else [-8, 8],
                    joins=joins(frame, anchors, "gravel-lane-8"), support_modes=["level_shelf","contour"],
                    centerline_uv=[uv(point, frame) for point in route])

    frame = (104, 88)
    top, bottom = (12, 12), (92, 72)
    stair = [(20+8*i, 12+7.5*i) for i in range(9)]
    nosing = "M7 8H20"
    for x, y in stair[1:]:
        nosing += f"H{x}V{y-4}"
    shape = nosing + "H97V77H80L7 17Z"
    cap = nosing + "H97"
    risers = "".join(path(f"M{x-8} {y-4}h8", "none", "#c6b297", .9, .87) for x, y in stair[1:])
    yield asset("stair", "street", "fieldstone_steps", frame, top, (80, 60), TERRACE, {
        "stone": wash("stair", shape, "#817669", (6, 7, 98, 79), ["#5d584c", "#bbab90", "#8e9580"], 183, 360)
                 + clip("joints", shape, masonry((6, 6, 98, 81), (8, 4), "#655b51", 24))
                 + path(cap, "none", "#b8ab91", .8) + risers,
        "wet": clip("wet-steps", shape, path("M8 10H21M33 20l4 2m4 8h8m18 16h9m7 25h13",
                                           "none", "#e0d4b7", .8, .71)),
        "mask-coverage": path(shape, "white"),
        "mask-wetness": clip("wet-step-mask", shape, path("M8 10H21M33 20l4 2m4 8h8m18 16h9m7 25h13",
                                                        "none", "white", .8)),
    }, can_mirror=True, depth_f=.44, allowed_slope_deg=[20, 42], support_modes=["stepped_cut"],
        joins=joins(frame, {"upper": top, "lower": bottom}, "gravel-lane-8"),
        centerline_uv=[uv(p, frame) for p in [top, (22, 12), (85, 72), bottom]],
        landings_uv=[[uv((7, 8), frame), uv((22, 16), frame)], [uv((82, 68), frame), uv((97, 76), frame)]])


def foundations():
    frame = (96, 44)
    for name, mode, shape, make_steps in [
        ("level-plinth", "level_plinth", "M12 12H84V24H12Z",
         [(12, 84, 24)]),
        ("rising-plinth", "stepped_plinth", "M12 12H84V24H60V29H36V34H12Z",
         [(12, 36, 34), (36, 60, 29), (60, 84, 24)]),
    ]:
        yield asset(name, "foundation", "fieldstone", frame, (48, 12), (72, 22), TERRACE, {
            "stone": (wash("stone-wash", shape, "#93816d", (11, 11, 85, 35), ["#4a4842", "#cbb79a", "#73775f"], 33)
                      + clip("joints", shape, masonry((11, 11, 85, 35), (8, 4), "#66594c", 37))
                      + rect(12, 12, 72, 2, "#c0ad91")),
            "wet": rect(15, 12.5, 65, .7, "#e2d0af", .8),
            "mask-support": path(shape, "white"),
        }, depth_f=.63, compatible_footprint_f=[1, .63], supported_mode=mode,
            top_span_uv=[uv((x, 12), frame) for x in (12, 84)],
            terrain_steps_uv=[[uv((x, y), frame) for x in (a, b)] for a, b, y in make_steps])


def public_ground():
    data = [
        ("park-ground", (160, 65), (79, 45), (144, 35),
         "M8 30Q24 12 52 14L87 12 136 19 151 39 133 53H28Z",
         "#8c9273", ["#b6ad83", "#647854", "#c2a978"], GARDEN, "park"),
        ("play-yard", (144, 61), (72, 42), (126, 34),
         "M9 22L28 12H114L135 24 128 45 111 50H24L9 41Z",
         "#beaa86", ["#756a54", "#ede0ba", "#ab8768"], CIVIC, "playground"),
        ("plaza-paving", (127, 60), (63, 17), (112, 34),
         "M20 14H111L119 32 100 48H27L8 33Z",
         "#b4a38d", ["#6a6256", "#ddceb2", "#a38a71"], CIVIC, "plaza"),
    ]
    for i, (name, frame, entry, size, shape, base, tones, refs, use) in enumerate(data):
        surface = wash("lot-fill", shape, base, (6, 12, frame[0]-6, 55), tones, 313+i, 800)
        if use == "park":
            surface += path("M79 46Q79 37 65 29T38 26m28 4q20-11 48-9", "none", "#bbac8d", 4.8, .85)
            surface += path("M19 31Q30 36 47 35M111 38Q128 43 137 38", "none", "#697a57", 3, .57)
        if use == "plaza":
            surface += clip("cobble", shape, masonry((7, 13, 120, 48), (6, 3), "#6e6557", 231, .56))
        if use == "playground":
            surface += path("M72 44V36q-12-8-28-9m28 9 30-5", "none", "#d4bb97", 5, .67)
            surface += path("M30 20h87m-94 22h34m30 0h29", "none", "#7c705d", .75, .48)
        edge = {
            "park": "M11 37Q23 52 57 52H68M90 52h35l19-11",
            "plaza": "M10 34L28 48H99l18-14",
            "playground": "M13 41L24 50H62M84 50h27l14-7",
        }[use]
        wet_shape = "M13 29q25-3 46-1l-8 2-35 1zM90 33q21-4 40-4l-4 2-34 4z"
        yield asset(name, "ground", "parcel_surface", frame, entry, size, refs, {
            "surface": surface,
            "near-edge": path(edge, "none", "#86775d", 1.6, .62),
            "wet": clip("wet-pavement", shape, path(wet_shape, "#dcd7b7", opacity=.51)),
            "mask-support": path(shape, "white"),
            "mask-wetness": clip("wet-pixels", shape, path(wet_shape, "white", opacity=.56)),
        }, use_tags=[use], depth_f=.85, support_modes=["level_shelf"],
            joins=joins(frame, {"entry": entry}, "pedestrian-access"),
            sockets={"entry": {"uv": uv(entry, frame), "accepts": ["access_path"]},
                     "furniture": {"uv": uv((frame[0]*.32, 35), frame), "accepts": ["ground_prop"]}},
            entrance={"threshold_uv": uv(entry, frame), "clearance_f": {"width": .31, "depth": .4}, "approach": "front"})


def fields():
    frame = (243, 68)
    shape = "M8 22Q62 12 112 16L185 23Q216 26 234 40L215 53Q148 59 115 53L41 47Z"
    for i, (name, base, dark) in enumerate([
        ("orchard-soil", "#a18b6d", "#746b54"), ("field-stubble", "#b09e71", "#897857"),
    ]):
        surface = wash("earth", shape, base, (8, 12, 234, 58), ["#726a4e", "#d2ba87", "#657555"], 25+i, 950)
        surface += clip("furrows", shape, "".join(
            path(f"M9 {y}Q65 {y-10} 126 {y-1}Q179 {y+5} 232 {y+16}", "none", dark, 1.45, .57)
            + path(f"M19 {y+1}Q98 {y-7} 149 {y+5}L216 {y+13}", "none", "#cbb791", .65, .61)
            for y in range(20, 51, 5)))
        yield asset(name, "ground", "agricultural", frame, (120, 34), (226, 42), GARDEN, {
            "surface": surface, "mask-support": path(shape, "white"),
        }, use_tags=["orchard" if i==0 else "field"], depth_f=1.15,
            support_modes=["contour", "level_shelf"], allowed_slope_deg=[-8, 8],
            joins=joins(frame, {"start": (14, 25), "end": (228, 40)}, "field-edge"))


def furniture():
    bench = "M6 13H44V17H6ZM7 18H43V21H7ZM8 22H42V25H8ZM10 25h3v6h-3zm27 0h3v6h-3z"
    frame = (50, 38)
    yield asset("bench", "prop", "park_furniture", frame, (25, 31), (38, 18), GARDEN, {
        "shadow": ellipse(25, 31, 17, 1.8, "#524c3f", .34),
        "iron": path("M9 16l3 12v3m28-15-2 12v3M6 21v3h38v-3", "none", "#665b4c", 1.25),
        "wood": wash("wood", bench, "#88705b", (5, 13, 45, 32), ["#c7a479", "#5d5245"], 31, 85),
        "mask-occlusion": path(bench, "white"),
    }, depth_f=.22, accepts_sockets=["ground_prop"], excludes=["entrance_corridor"])

    stone = "M7 23Q21 18 37 23V34Q25 42 7 34Z"
    timber = "M10 28V11H13V28ZM30 28V11H33V28ZM6 15L22 5 38 15 36 18 22 11 8 18Z"
    frame = (44, 47)
    yield asset("well", "prop", "plaza_stone", frame, (22, 38), (32, 33), CIVIC, {
        "shadow": ellipse(22, 38, 16, 2.2, "#544f41", .30),
        "timber": path(timber, "#756756") + path("M22 12v14m-5-10 5-4 5 5", "none", "#655544"),
        "stone": wash("stone", stone, "#998775", (6, 22, 38, 39), ["#c7af93", "#675d4d"], 75, 150)
                 + clip("stone-joints", stone, masonry((7, 25, 37, 40), (6, 4), "#685e50", 74))
                 + ellipse(22, 24, 13.5, 3, "#696a58", .86),
        "mask-occlusion": path(stone, "white") + path(timber, "white"),
    }, depth_f=.32, accepts_sockets=["ground_prop"], excludes=["entrance_corridor"])

    frame = (90, 65)
    posts = "M8 51L18 12H54L65 51M53 12l-8 39M19 12l9 39M63 54V21h9v27"
    slide = "M70 24Q71 44 83 51L80 55Q66 46 66 24Z"
    swings = "M29 15v28m11-28v28M26 43h7m3 0h8"
    yield asset("swing-and-slide", "prop", "yard_equipment", frame, (45, 54), (75, 43), CIVIC, {
        "shadow": ellipse(46, 55, 33, 2, "#665749", .22),
        "rear-supports": path(posts, "none", "#795c4b", 1.9, .95),
        "seats": path(swings, "none", "#6c6650", 1.25, .92),
        "front-slide": path(slide, "#ad7955") + path("M67 25q.8 17 13 28", "none", "#e3af75", 1.4, .83),
        "mask-occlusion": path(posts, "none", "white", 1.9) + path(slide, "white") + path(swings, "none", "white", 1.25),
    }, depth_f=.46, accepts_sockets=["ground_prop"], excludes=["school_access", "entrance_corridor"],
        clearances_f={"left": .14, "right": .17, "front": .28})

    frame = (127, 28)
    rails = "M7 12H51M75 12h45M7 17H51M75 17h45"
    pales = "".join(f"M{x} {11-x%3}v12" for x in [*range(7, 51, 6), 51, *range(75, 121, 6)])
    yield asset("yard-fence", "boundary", "painted_wood", frame, (63, 21), (113, 13), CIVIC, {
        "rails": path(rails, "none", "#776e58", 1, .88) + path(pales, "none", "#a29a7a", 1.5),
        "mask-occlusion": path(rails, "none", "white", 1) + path(pales, "none", "white", 1.5),
    }, depth_f=.10, accepts_sockets=["lot_edge"], excludes=["school_access"],
        joins=joins(frame, {"gate": (63, 21), "left": (7, 21), "right": (120, 21)}, "yard-edge"),
        clearance_f={"gate_width": 24/72})


def trees():
    frame = (135, 151)
    crown_back = "M13 58Q9 43 24 30Q24 18 42 17Q49 8 66 13Q79 8 94 25Q113 24 121 43Q127 54 120 65Q115 78 98 81Q80 95 61 82Q39 91 27 74Q15 73 13 58Z"
    front = "M33 49Q32 33 50 31Q62 21 77 31Q96 27 103 43Q116 52 107 65Q111 77 92 83Q77 98 61 86Q44 92 37 76Q24 70 33 49Z"
    trunk = "M61 136Q66 110 64 89Q62 72 52 58L56 55Q67 69 69 82Q73 69 87 60L90 63Q78 72 75 90Q72 112 76 135Z"
    branch = "M68 99Q59 76 36 65M72 85Q76 65 96 52M69 110Q63 93 46 88"
    yield asset("autumn-tree", "plant", "deciduous", frame, (68, 136), (113, 128), GARDEN, {
        "crown-rear": wash("back", crown_back, "#a48b61", (12, 13, 124, 89),
                           ["#705f50", "#d4aa6e", "#9c775b", "#c7b983"], 37, 1630, 1.35),
        "trunk": wash("bark", trunk, "#716050", (50, 50, 96, 138), ["#c0a57e", "#4e4d42"], 253, 270)
                 + path(branch, "none", "#74634e", 2.3, .88),
        "crown-front": wash("face", front, "#b18d5c", (23, 24, 118, 96),
                            ["#c7a36a", "#8a674c", "#e3bc82", "#777151"], 63, 1750, 1.25),
        "mask-rear-canopy": path(crown_back, "white"),
        "mask-trunk": path(trunk, "white") + path(branch, "none", "white", 2.3),
        "mask-front-canopy": path(front, "white"),
    }, depth_f=.49, can_mirror=True, use_tags=["deciduous", "split_tall"],
        depth_parts={"rear": ["crown-rear"], "front": ["trunk", "crown-front"]},
        accepts_sockets=["planting"], excludes=["entrance_corridor"])

    frame = (100, 110)
    boughs = ("M47 98Q50 76 47 57Q44 40 36 31M50 83Q51 49 72 28M49 74Q41 58 25 54"
              "M50 68Q53 48 52 25M50 79Q62 65 75 60")
    canopy = ("M12 46Q8 30 26 30Q25 19 36 20Q39 8 53 13Q66 10 69 23Q83 20 88 33"
              "Q99 52 86 55Q83 73 70 70Q61 78 51 66Q36 75 28 66Q11 65 12 46Z")
    clusters = [(25, 42, 14, 10), (39, 32, 13, 13), (54, 24, 13, 11), (70, 37, 16, 13),
                (80, 49, 13, 10), (29, 54, 16, 11), (58, 52, 15, 15), (71, 59, 14, 11)]
    glazes = "".join(ellipse(cx, cy, rx, ry, ["#a57258", "#bb8664", "#a99164"][i%3], .57)
                     for i, (cx, cy, rx, ry) in enumerate(clusters))
    yield asset("rowan", "plant", "deciduous", frame, (49, 98), (84, 86), GARDEN, {
        "boughs": path(boughs, "none", "#736252", 2.55, .94),
        "leaves": (path(canopy, "#ab8e64", opacity=.51) +
                   clip("rowan-leaves", canopy, glazes + pigment(204, (10, 12, 95, 75),
                        ["#a17255", "#755f42", "#d6ac72", "#ddc288"], 1380, 1.5))),
        "mask-occlusion": path(canopy, "white") + path(boughs, "none", "white", 2.55),
    }, depth_f=.32, can_mirror=True, use_tags=["deciduous", "orchard"],
        accepts_sockets=["planting"], excludes=["entrance_corridor"])

    frame = (79, 117)
    body = ("M39 7L45 26l-3-2 12 17-8-3 13 18-10-3 14 19-12-2 16 19-13-3 16 12"
            "Q59 100 46 97L43 106H36L35 97Q23 100 9 94l16-14-11 2 16-17-11 4 15-19-10 3 13-19-9 4 10-16-4 2z")
    yield asset("fir", "plant", "conifer", frame, (39, 106), (63, 99), TERRACE, {
        "bark": path("M35 106l3-27h5l1 27z", "#776652"),
        "needle-wash": wash("fir-foliage", body, "#687c68", (8, 7, 72, 109),
                            ["#4e6255", "#9b9a76", "#bcc093", "#586451"], 68, 1400, .95),
        "needle-boughs": "".join(path(f"M{40-t} {56+t*1.14:.2f}q{t*.8:.2f} 0 {t*1.9:.2f} 3",
                                      "none", "#93a084", .75, .38) for t in range(6, 21, 3)),
        "mask-occlusion": path(body, "white"),
    }, depth_f=.42, can_mirror=True, use_tags=["conifer"],
        accepts_sockets=["planting"], excludes=["entrance_corridor"])


def weather():
    frame = (654, 148)
    fog_gradient = ('<defs><radialGradient id="vapor"><stop stop-color="white" stop-opacity=".9"/>'
                    '<stop offset=".53" stop-color="white" stop-opacity=".61"/>'
                    '<stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient></defs>')
    shapes = [(152, 61, 139, 32, .64), (279, 70, 137, 35, .59),
              (407, 87, 155, 40, .70), (516, 79, 112, 29, .55)]
    density = fog_gradient + "".join(ellipse(x, y, rx, ry, "url(#vapor)", alpha)
                                     for x, y, rx, ry, alpha in shapes)
    noise = fog_gradient + "".join(ellipse(i, 70 + round(12*math.sin(i*.081)), 38, 25,
                                          "url(#vapor)", .24) for i in range(60, 605, 29))
    yield asset("valley-mist", "mist", "shallow_wisp", frame, (327, 72), (630, 127), TERRACE, {
        "mist": f'<g opacity=".57">{density}</g>',
        "mask-density": density,
        "mask-falloff": fog_gradient + ellipse(327, 74, 319, 66, "url(#vapor)", 1),
        "mask-noise": noise,
    }, distribution={"tile_axes": [], "repeat": "nonperiodic-overlap",
        "drift_axis": "x", "transparent_padding_px_min": 12, "band_gaps": ["middle-to-near"],
        "opacity_range": [.07, .18], "density": "mask-density", "falloff": "mask-falloff", "noise": "mask-noise"})


def landscape():
    yield from lanes()
    yield from foundations()
    yield from public_ground()
    yield from fields()
    yield from furniture()
    yield from trees()
    yield from weather()
