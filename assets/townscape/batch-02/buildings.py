"""The eleven original shells and the pieces that fit their openings."""
from dataclasses import dataclass

from authoring import asset, clip, ellipse, label, linear_gradient, masonry, path, rect, uv, wash

HISTORIC = ["REF-T01", "REF-L05"]
MODERN = ["REF-U03", "REF-T03"]
RURAL = ["REF-S09", "REF-L10"]
COMPONENT_PREFIX = "townscape.b02."

# Mount points are the centre of the sill or threshold, with dimensions in near-plane units.
PARTS = {
    "sash": ("historic-sash", (28, 37), (14, 29), (15, 23)),
    "ribbon-window": ("modern-bay", (40, 30), (20, 23), (28, 17)),
    "panel-door": ("domestic-threshold", (25, 39), (12.5, 33), (13, 25)),
    "bakehouse-front": ("historic-shop-bay", (76, 56), (38, 50), (60, 41)),
    "stone-sill": ("stone-sill", (29, 16), (14.5, 9), (18, 3)),
}


def parts():
    arch = "M7 28V12C7 5 20 5 21 12V28Z"
    broad = "M6 7H34V22H6Z"
    doorway = "M6 32V14Q6 8 12.5 8Q19 8 19 14V32Z"
    panes = "M12 21H40V36H12Z M42 21H48V36H42Z M53 22H65V39H53Z"
    records = {
        "sash": (arch, {
            "recess": path("M6 29V12C6 4 22 4 22 12V29Z", "#645a4c"),
            "backing": path(arch, "#858c7a"),
            "glass": path("M8 18l8-8h3l-11 11zM13 26l7-7v2l-5 5z", "#d1d2b6", opacity=.42),
            "frame": path("M7 28V12C7 5 20 5 21 12V28ZM14 8v21M7 18.5h14", "none", "#c1ab8a", .9),
            "light": path(arch, "#dec483", opacity=.76),
        }),
        "ribbon-window": (broad, {
            "recess": rect(5, 6, 30, 17, "#4c5956"),
            "backing": rect(6, 7, 28, 15, "#79887f"),
            "glass": path("M7 21l11-12h5L12 21zM23 21l10-10v3l-6 7z", "#c2c6ad", opacity=.45),
            "frame": path("M6 7H34V22H6ZM15 7v15m9-15v15M6 11h28", "none", "#c2b9a1", 1),
            "light": rect(6, 7, 28, 15, "#c9a876", .58),
        }),
        "panel-door": (doorway, {
            "recess": path("M5 33V14q0-8 7.5-8t7.5 8v19Z", "#70665a"),
            "panel": path(doorway, "#657264") + path("M8 29V19h9v10zM8 16v-3q4.5-5 9 0v3z", "#899284"),
            "frame": path("M7 32V14q0-7 5.5-7t5.5 7v18M5 32.5h15", "none", "#b8a58a", .8)
                     + ellipse(15.8, 23, .75, .75, "#cfb683", .86),
        }),
        "bakehouse-front": (panes, {
            "recess": path("M8 17H68V49H8Z", "#635348") + rect(7, 13, 62, 4, "#80645a"),
            "backing": path(panes, "#807460") + path("M13 33h34v1.2H13zM13 27h34v1H13z", "#bba183"),
            "bread": "".join(ellipse(x, y, 2.2, 1.4, "#bc9970", .68) for y in (26, 32) for x in range(16, 47, 6)),
            "glass": path("M13 23h10L13 33zM34 22h5l-8 8h-4zM54 23h8l-8 9z", "#dbd0b2", opacity=.26),
            "frame": (path("M11 20H49V37H11ZM31 21v15M52 21H66V49H52ZM53 39h12M10 48h39M8 17h60",
                           "none", "#bd9f82", 1.4) + rect(13, 39, 34, 5, "#7b6454"))
                      + label(38, 16, "BAKERY", 3.4),
            "light": path(panes, "#ebbf76", opacity=.51),
        }),
        "stone-sill": (None, {
            "stone": path("M5 6h19l-1 3H6Z", "#9c8b77") + path("M5 6h19", "none", "#d1bea1", .7),
        }),
    }
    for name, (aperture, layers) in records.items():
        socket, frame, pivot, size = PARTS[name]
        if aperture:
            layers["mask-aperture"] = path(aperture, "white")
        yield asset(name, "component", "opening_detail", frame, pivot, size,
                    ["REF-U03"] if name == "ribbon-window" else ["REF-T01"], layers,
                    accepts_sockets=[socket], excludes=["blocked_bay"], depth_f=0,
                    overlay_before={"light": "glass"} if "light" in layers else {},
                    semantic_tags=["window" if "window" in name or name == "sash" else "facade_detail"])


@dataclass(frozen=True)
class Shell:
    name: str
    group: str
    use: str
    span: int
    base_y: int
    width_y: int          # top of the straight wall section
    wall: str            # path to the left and right floor edges and through the eaves
    roof: str            # individual roof silhouette in the same frame
    paint: str
    roof_tone: str
    wood: str
    material: str
    roof_style: str
    door_x: float
    windows: tuple       # (centre x, sill y, scale, part)
    details: str = ""
    chimneys: tuple = ()


def sash_row(xs, y, size=1, part="sash"):
    return tuple((x, y, size, part) for x in xs)


def designs():
    return [
        Shell("gable-house", "attached_historic", "house", 60, 126, 53,
              "M0 53L28 23 60 53V126H0Z", "M0 53L28 18 60 51V57L28 28 0 59Z",
              "#c8b38f", "#64706c", "#93715a", "plaster", "pitched", 43,
              sash_row((30,), 51, .68) + sash_row((13, 44), 78, .87) + sash_row((15,), 111, .92),
              path("M0 83h60M0 103h60", "none", "#d6bfa0", 1.35), ((45, 34),)),
        Shell("weavers-house", "attached_historic", "house", 82, 126, 53,
              "M0 53L12 39H58L82 53V126H0Z", "M0 51L13 31 58 28 82 51V56L0 58Z",
              "#b8ab8e", "#896157", "#766556", "timber", "pitched", 58,
              sash_row((15, 40, 66), 79, .84) + sash_row((15, 37), 109, .82),
              path("M12 55V85M30 55V85M55 54V85M73 54V85M0 85H82M0 84l12-29m18 29L55 55m0 29 18-29",
                   "none", "#7e6656", 2.5, .83) + path("M7 89H75", "none", "#ddc7a2", 1.1), ((25, 32),)),
        Shell("corner-house", "attached_historic", "house", 74, 126, 53,
              "M0 53H74V126H0Z", "M0 49L21 20H55L74 48V56H0Z",
              "#caa48a", "#775e56", "#8b7363", "plaster", "hipped", 22,
              sash_row((17, 38, 58), 80, .85) + sash_row((52,), 111, .97),
              path("M0 83h74M2 59v62m70-62v62", "none", "#b18f73", 1.1), ((57, 28),)),
        Shell("bakery", "attached_historic", "bakery", 68, 126, 53,
              "M0 53H11V45H20V34H29V23H40V34H51V45H59V53H68V126H0Z",
              "M0 52H10V43H19V32H28V21H41V32H52V43H60V52H68V56H56V48H47V37H37V26H32V37H24V48H14V56H0Z",
              "#c5a086", "#836253", "#876252", "brick", "stepped-gable", 58,
              sash_row((34,), 49, .60) + sash_row((15, 34, 53), 76, .71),
              path("M4 80h60M8 58h52", "none", "#d1b295", 1.3)),
        Shell("garden-villa", "detached", "house", 88, 126, 50,
              "M0 51H88V126H0Z", "M-3 48L19 23 66 21 91 47 88 55H0Z",
              "#cbc0a0", "#687169", "#657567", "plaster", "hipped", 45,
              sash_row((18, 44, 71), 77, .92) + sash_row((16, 72), 109, 1.0),
              path("M34 122V97q0-13 11-13t11 13v25z", "#ae9a84")
              + path("M5 84h78M4 116h80", "none", "#b1a68d", 1.2)
              + path("M30 53V40L43 28 56 40V53Z", "#a99e87")
              + path("M38 50v-8l5-5 5 5v8z", "#536960"), ((62, 28),)),
        Shell("stone-cottage", "detached", "house", 58, 126, 68,
              "M0 69L22 39 46 62 58 75V126H0Z", "M-4 70L22 33 48 62 62 75 59 80 22 43 0 76Z",
              "#a79f8a", "#6d6962", "#878572", "stone", "catslide", 43,
              sash_row((19,), 73, .6) + sash_row((15, 31), 110, .66),
              path("M2 90h51", "none", "#d0bea6", 1.2), ((42, 54),)),
        Shell("brick-infill", "modern", "flats", 84, 126, 53,
              "M0 48H84V126H0Z", "M0 45H57V40H84V51H0Z",
              "#ab8c77", "#63716d", "#68766d", "brick", "low", 68,
              sash_row((22, 60), 77, 1, "ribbon-window") + sash_row((21, 46), 106, .72, "ribbon-window"),
              path("M0 81H84M0 113H84", "none", "#c7b09a", 1.4) +
              path("M4 67v14h32V67m-28 1v12m6-12v12m6-12v12m6-12v12m6-12v12",
                   "none", "#5f6d64", 1.05, .91)),
        Shell("garden-walkup", "modern", "flats", 92, 126, 55,
              "M0 59L20 41 89 47 92 66V126H0Z", "M-3 58L18 36 91 43 95 52 20 46 0 64Z",
              "#b8b5a1", "#69756b", "#67756a", "plaster", "low-pitch", 50,
              sash_row((19, 73), 78, 1, "ribbon-window") + sash_row((17, 75), 109, .92, "ribbon-window"),
              path("M44 55h12v47H44z", "#8b9788") +
              path("M46 58V93m6-35v32M7 82h24m30 0h24M8 85V73m6 10V74m6 11V74m6 11V74m38 11V74m6 11V74m6 11V74m6 11V74",
                   "none", "#d1cbb2", 1.05)),
        Shell("barn", "barn", "farm", 100, 126, 64,
              "M0 65L35 34H64L100 65V126H0Z", "M-4 64L33 26H65L104 63 101 69 64 35H36L0 70Z",
              "#a39078", "#7b6b5c", "#6e6357", "boards", "pitched", 50,
              sash_row((17, 83), 92, .65),
              path("M34 126V91Q34 84 41 84H59Q66 84 66 91V126Z", "#6a6051") +
              path("M37 125V93q0-6 6-6h14q6 0 6 6v32z", "#8a7561") +
              path("M37 93h26M50 87v38m-13-29 12 25m14-25-12 25M45 56h10v9H45z", "none", "#b4a084", 1.2)),
        Shell("school", "school", "school", 148, 153, 74,
              "M0 81H59V55H64V34H84V55H89V81H148V153H0Z",
              "M-3 83L15 61H61V55H65V37L61 36 74 15 87 36 83 37V55H87V61H133L151 82 148 87H0Z",
              "#c7ba9b", "#7d665e", "#806858", "plaster", "pitched", 74,
              sash_row((16, 43, 105, 132), 112, 1.09) + sash_row((15, 42, 105, 132), 140, .92),
              path("M59 152v-32q0-13 15-13t15 13v32zM68 39h12v19H68z", "#a49680") +
              ellipse(74, 71, 8.7, 8.7, "#8e7867", 1) + ellipse(74, 71, 7, 7, "#d5c7a4", 1) +
              path("M74 66v5l4 2M0 116h59m30 0h59M2 145h54m36 0h54", "none", "#756a58", 1) +
              label(74, 105, "SCHOOL", 3.6, "#655546", .48)),
        Shell("inn", "inn", "inn", 100, 126, 51,
              "M0 54L16 29H67L83 47 93 34 100 48V126H0Z", "M-4 54L13 23H68L85 44 93 28 104 47V53L93 37 85 52 66 32H18L0 60Z",
              "#c6b38f", "#836252", "#7b6a58", "timber", "cross-gable", 49,
              sash_row((24, 55, 78), 78, .83) + sash_row((20, 78), 109, 1.16),
              path("M5 57h64m-53 0v27m15-27v27m13-27v27m15-27v27M2 85h96", "none", "#87725d", 1.5) +
              path("M36 91h26v9H36z", "#686655") + label(49, 97.5, "INN", 4.2)
              + path("M88 49v-5l4-4 4 4v5z", "#80745e"), ((22, 25), (59, 24))),
    ]


def cap(side, span, top, bottom, tone):
    x = 0 if side == "left" else span
    d = -10 if x == 0 else 10
    face = f"M{x} {top}l{d} -4V{bottom-4}l{-d} 4Z"
    return path(face, tone) + path(f"M{x} {bottom-6}l{d} -4m{-d} {-bottom+top+18}l{d} -4",
                                   "none", "#c6b295", .6, .7)


def building(design, index):
    spec = design
    attached = spec.group == "attached_historic" or spec.name == "brick-infill"
    frame = (spec.span + 32, spec.base_y + 12)
    trim_top = spec.base_y - 73 if attached else spec.width_y
    pivot = (16 + spec.span/2, spec.base_y)
    roof_tops = (18, 23, 18, 21, 18, 33, 40, 36, 26, 15, 14)
    bound = (-4, 15, spec.span+4, spec.base_y)
    wall_colors = ["#695946", "#e2caa6", "#a37e64", "#b9baa0"]
    roof_colors = ["#4d4942", "#ba927a", "#c5a992", "#7e8d7a"]
    main_wall = linear_gradient("plaster-tones", spec.paint, "#aca18a")
    main_wall += wash("wall-pigment", spec.wall, "url(#plaster-tones)", bound, wall_colors, 200 + index, 540)
    if spec.material in ("stone", "brick"):
        spacing = (9, 4) if spec.material == "stone" else (6, 3)
        main_wall += clip("joints", spec.wall, masonry((0, 35, spec.span, spec.base_y),
                                                        spacing, "#785f52", index, .53))
    if spec.material == "boards":
        main_wall += clip("boards", spec.wall, "".join(
            path(f"M{x} 33l{(x % 5 - 2) * .6} {spec.base_y-33}", "none", "#715c4c", .64, .54)
            for x in range(3, spec.span, 4)))
    base = rect(0, spec.base_y-6, spec.span, 6, "#897a67", .63)
    drip = path(f"M1 {trim_top+6}l5 8-2 21 3 42-7 4zM{spec.span-1} {trim_top+3}l-5 8 3 55-3 13h6z",
                "#775f4f", opacity=.13)
    wall = main_wall + clip("plinth-and-drips", spec.wall, base + drip)
    roof = wash("roof-pigment", spec.roof, spec.roof_tone, bound, roof_colors, 400 + index, 540)
    if spec.roof_style not in ("low", "low-pitch", "stepped-gable"):
        roof += clip("tiles", spec.roof, masonry((-3, 22, spec.span+4, max(85, trim_top)),
                                                (6, 3), "#4b4941", index, .61))
    chimney = "".join(path(f"M{x} {y+8}V{y-9}h7v20z", "#8e7667")
                      + path(f"M{x-1} {y-9}q4-3 9 0v2h-9z", "#625851")
                      for x, y in spec.chimneys)
    chimney_mask = "".join(path(f"M{x} {y+8}V{y-9}h7v20zM{x-1} {y-9}q4-3 9 0v2h-9z", "white")
                           for x, y in spec.chimneys)
    layers = {
        "shadow": ellipse(spec.span/2, spec.base_y+.7, spec.span/2+3, 2.7, "#403d32", .30),
        "wall": wall,
        "chimney": chimney,
        "roof": roof,
        "trim": spec.details + path(f"M0 {spec.base_y-.5}H{spec.span}", "none", "#6c6354", .62, .76),
        "wet": clip("roof-wet-mask", spec.roof, "".join(
            path(f"M4 {y}q{spec.span*.46} -2 {spec.span-8} 0", "none", "#e3ded0", .54, .42)
            for y in range(35, trim_top+4, 6))) + path(f"M3 {spec.base_y-2}H{spec.span-5}", "none", "#e0cbb1", .8, .62),
        "mask-wall": path(spec.wall, "white"),
        "mask-occlusion": path(spec.wall, "white") + path(spec.roof, "white") + chimney_mask,
        "mask-entrance": rect(spec.door_x-5, spec.base_y-12, 10, 12, "white"),
    }
    if attached:
        layers["end-left"] = cap("left", spec.span, trim_top, spec.base_y, "#998674")
        layers["end-right"] = cap("right", spec.span, trim_top, spec.base_y, "#867564")
    layers = {name: f'<g transform="translate(16 0)">{content}</g>'
              for name, content in layers.items() if content}
    openings = list(spec.windows)
    if spec.name == "bakery":
        openings.append((38, spec.base_y, .94, "bakehouse-front"))
    elif spec.name != "barn":
        openings.append((spec.door_x, spec.base_y, 1.15 if spec.name == "school" else 1, "panel-door"))
    openings += [(x, y+1, scale, "stone-sill") for x, y, scale, part in spec.windows if part == "sash"]
    sockets = {}
    mounts = []
    for count, (x, y, scale, part) in enumerate(openings, 1):
        accepts = PARTS[part][0]
        socket = f"{part}-{count}"
        sockets[socket] = {"uv": uv((x+16, y), frame), "accepts": [accepts]}
        mounts.append({"socket": socket, "asset": COMPONENT_PREFIX + part, "scale": scale,
                       **({"light_group": "ground" if y > spec.base_y - 36 else "upper"}
                          if part in ("sash", "ribbon-window", "bakehouse-front") else {})})
    entrance = uv((spec.door_x+16, spec.base_y), frame)
    sockets["entrance"] = {"uv": entrance, "accepts": ["access_path"]}
    refs = MODERN if spec.group == "modern" else RURAL if spec.group in ("barn", "detached") else HISTORIC
    return asset(spec.name, "shell", spec.group, frame, pivot,
                 (spec.span, spec.base_y - roof_tops[index]),
                 refs, layers,
                 use_tags=[spec.use, "attached" if attached else "detached", spec.roof_style],
                 shell_group=spec.group, roof_profile=spec.roof_style, wall_material=spec.material,
                 ground_span_uv=[uv((x, spec.base_y), frame) for x in (16, 16+spec.span)],
                 depth_f=.63 if attached else .70 if spec.group == "detached" else 1.1,
                 foundation_modes=["level_plinth", "stepped_plinth"] if attached else ["level_plinth"],
                 entrance={"threshold_uv": entrance,
                           "clearance_f": {"width": (18 if spec.name == "school" else 12)/72, "depth": .22},
                           "approach": "front", "mask": "mask-entrance"},
                 wall_contacts={
                     side: {"profile": "historic-shared-73",
                            "span_uv": [uv((x, y), frame) for y in (trim_top, spec.base_y)],
                            "exposed_end_layer": f"end-{side}"}
                     for side, x in (("left", 16), ("right", 16+spec.span))
                 } if attached else {},
                 sockets=sockets, mounts=mounts,
                 semantic_anchors={"pick_uv": uv((pivot[0], spec.base_y-35), frame),
                                   "sound_uv": uv((spec.door_x+16, spec.base_y-17), frame)})


def buildings():
    yield from parts()
    for index, spec in enumerate(designs()):
        yield building(spec, index)
