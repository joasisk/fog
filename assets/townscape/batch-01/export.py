"""Export the Batch 1 authoring masters and the slope-side calibration plates."""
import argparse
import json
import math
import random
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from xml.etree import ElementTree as ET

from PIL import Image, ImageChops, ImageDraw, ImageFont
from PIL.PngImagePlugin import PngInfo

ROOT = Path(__file__).resolve().parent
SVG = "http://www.w3.org/2000/svg"
INK = "http://www.inkscape.org/namespaces/inkscape"
ET.register_namespace("", SVG)
ET.register_namespace("inkscape", INK)


def path(d, fill, stroke="none", width=0.6, opacity=1):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" opacity="{opacity}"/>'


def rect(x, y, w, h, fill, opacity=1):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" opacity="{opacity}"/>'


def ellipse(x, y, rx, ry, color, opacity):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{color}" opacity="{opacity}"/>'


def wash(identifier, shape, color, tones, bounds, seed, count=350):
    """Layer irregular translucent deposits inside a material boundary."""
    rng = random.Random(seed)
    x0, y0, x1, y1 = bounds
    paint = []
    for i in range(count):
        x, y = rng.uniform(x0, x1), rng.uniform(y0, y1)
        size = rng.uniform(.16, 1.4) if i % 5 else rng.uniform(2, 9)
        paint.append(ellipse(round(x, 2), round(y, 2), round(size, 2),
                             round(size * rng.uniform(.17, .9), 2),
                             rng.choice(tones), rng.choice([.06, .11, .18])))
    return (f'<defs><clipPath id="{identifier}">{path(shape, "white")}</clipPath></defs>'
            + path(shape, color) + f'<g clip-path="url(#{identifier})">' + "".join(paint) + '</g>')


def master(name, w, h, layers):
    groups = []
    for label, art in layers.items():
        hidden = label.startswith("mask-") or label.startswith("motion-") and label != "motion-00" or label in {"wet", "unlit"}
        style = ' style="display:none"' if hidden else ""
        groups.append(f'<g id="{label}" inkscape:groupmode="layer" inkscape:label="{label}"{style}>{art}</g>')
    (ROOT / "sources" / f"{name}.svg").write_text(
        f'<svg xmlns="{SVG}" xmlns:inkscape="{INK}" width="{2*w}" height="{2*h}" viewBox="0 0 {w} {h}">\n'
        + "\n".join(groups) + "\n</svg>\n")


def sash(x, y, color):
    return (path(f"M{x-1} {y+17}v-14q8-8 16 0v14z", "#625b50")
            + path(f"M{x+1} {y+15}v-11q6-5 12 0v11z", color)
            + path(f"M{x+7} {y+1}v14m-6-6h12", "none", "#c4b49b")
            + path(f"M{x-2} {y+17}h18l-2 2h-15z", "#978477")
            + path(f"M{x+2} {y+7}l3-3m5 11l2-3", "none", "#ded3b9", .44, .55))


PANE = [(19, 77, 16, 23), (36, 77, 16, 23)]
ATTACHED = "M12 43H84V116H12Z"


def shell(name, use, wall, tiles, wood):
    detached = use == "home"
    book = use == "bookshop"
    wall_shape = "M13 54L48 21L82 54V116H13Z" if detached else ATTACHED
    if detached:
        roof_shape = "M8 55L48 16L88 54L84 58L48 25L12 59Z"
    elif book:
        roof_shape = "M12 31L25 23L54 26L61 17L84 32V45H12Z"
    else:
        roof_shape = "M12 30L46 11L84 29V45H12Z"

    layers = {
        "shadow": ellipse(48, 117.25, 38, 3.3, "#332e29", .21)
                  + ellipse(48, 116.6, 34, 1.8, "#2f2c25", .30),
        "wall": wash("plaster", wall_shape, wall, ["#654f41", "#eff2d9", "#b88158"], (12, 23, 84, 116), 3)
                + '<g clip-path="url(#plaster)">'
                + path("M13 56l11 1 3 15-11 31zM78 50l5 0v65h-9z", "#675040", opacity=.09) + '</g>',
        "roof": path("M66 33V17l6-2 6 2v22z", "#7f7065")
                + path("M64 16l8-2 8 2-2 2-12 1z", "#544f48")
                + wash("roofwash", roof_shape, tiles, ["#271f24", "#d6b49b", "#a97d65"],
                       (8, 12, 88, 59), 8, 480),
    }
    rng = random.Random(19)
    slates = []
    for y in range(19, 57, 3):
        slates.append(path(f"M8 {y+1}Q46 {y-1} 88 {y}", "none", "#463f3e", .45, .55))
        for x in range(9 + y % 7, 87, 5):
            j = rng.uniform(-1, 1)
            slates.append(path(f"M{x} {y}l{j:.1f} 2.5", "none", "#c0a394", .45, .47))
    eave = ("M9 56l39-37 39 37", 1.5) if detached else ("M12 44H84", 2.3)
    layers["roof"] += (f'<g clip-path="url(#roofwash)">{"".join(slates)}</g>'
                       + path(eave[0], "none", "#534b42", eave[1]))
    windows = [23, 58] if detached else [21, 59] if book else [18, 41, 64]
    layers["openings"] = "".join(sash(x, 47 if not detached else 58, "#8a9381" if x != 41 else "#d5b081")
                                 for x in windows)
    if book:
        layers["openings"] += path("M44 61v-8q4-4 8 0v8z", "#997859")
    layers["openings"] += path("M13 113h69v3H13z", "#84796a") if detached else rect(12, 113, 72, 3, "#84796a")
    if detached:
        layers["openings"] += (sash(26, 89, "#c7a979") + sash(57, 89, "#98a296")
                               + path("M42 115V93q0-5 6-6t6 6v22z", wood)
                               + path("M44 103h8m-8 3h8m-11 8h14", "none", "#665c4a"))
        layers["mask-entrance"] = rect(42, 105, 12, 11, "white")
    else:
        layers["shop-surround"] = (rect(16, 69, 64, 44, wood) + rect(14, 68, 68, 3, "#4d4b41")
                                   + rect(17, 71, 62, 4, "#e1c69a", .56)
                                   + rect(18, 102, 35, 9, "#2c302b", .34)
                                   + rect(58, 77, 18, 37, "#40372c")
                                   + rect(60, 80, 14, 18, "#bb9a6a")
                                   + rect(60, 100, 14, 13, wood)
                                   + path("M61 103h12v8H61zM59 115.5h17m-17-15.5h2", "none", "#c0ae8d", .9))
        title = "BOOKS" if book else "CAFÉ"
        layers["shop-surround"] += (f'<text x="48" y="74.5" text-anchor="middle" '
                                    f'font-family="DejaVu Sans" font-weight="bold" font-size="4.1" '
                                    f'letter-spacing="1" fill="#322c27">{title}</text>')
        layers["room-backing"] = "".join(rect(*p, "#c6955b") for p in PANE)
        layers["room-backing"] += path("M19 80h33v3H19zM19 96h33v4H19z", "#795d45")
        if book:
            for y in (85, 93):
                layers["room-backing"] += rect(19, y + 5, 33, 1, "#694d3d")
                for x in range(20, 51, 2):
                    layers["room-backing"] += rect(x, y + x % 3, 1.3, 5-x % 3,
                                                    ["#775349", "#ead0a0", "#687165"][x % 3])
        else:
            layers["room-backing"] += path("M19 91h12v3H19zM44 94h8v2h-8z", "#584b3c")
            layers["room-backing"] += "".join(ellipse(x, 80, 3, 1.8, "#ffe3a5", .83) for x in (27, 44))
            for frame in range(8):
                x = 27 + 17 * (1 - math.cos(frame * math.tau / 8)) / 2
                y = 89 + .7 * math.sin(frame * math.tau / 8)
                panes = "".join(rect(*p, "white") for p in PANE)
                figure = ellipse(x, y-1.5, 2, 2.5, "#514239", .93)
                figure += path(f"M{x-1.3} {y+.4}q-2 1-2 4l-1 8h7l-1-8q0-3-2-4z", "#655447")
                figure += path(f"M{x+1} {y+3}l3 2 2-1", "none", "#5a493c", 1.4)
                layers[f"motion-{frame:02}"] = (
                    f'<defs><clipPath id="motion-clip-{frame}">{panes}</clipPath></defs>'
                    f'<g clip-path="url(#motion-clip-{frame})">{figure}</g>')
        for i, (x, y, w, h) in enumerate(PANE, 1):
            layers[f"glass-{i}"] = (rect(x, y, w, h, "#b4c1aa", .17)
                                    + path(f"M{x+2} 90l9-11h2l-11 14z", "#f4ead2", opacity=.24)
                                    + path(f"M{x+3} 97l10-13", "none", "#ede4ce", .7, .21))
        layers["frame"] = path("M18 76h35v25H18zM35.5 77v23M19 88h33", "none", wood, 1.15)
        layers["frame"] += path("M17 101h37m-35-24h33", "none", "#d8bb8f", .55)
        layers["unlit"] = "".join(rect(*p, "#2f3934", .72) for p in PANE)
        for i, p in enumerate(PANE, 1):
            layers[f"mask-pane-{i}"] = rect(*p, "white")
        layers["mask-entrance"] = rect(61, 105, 12, 11, "white")

    layers["wet"] = path("M14 44h65M20 113h18m23 2h12", "none", "#ece4d0", .65, .42)
    layers["mask-wall"] = path(wall_shape, "white")
    layers["mask-occlusion"] = (path(wall_shape, "white") + path(roof_shape, "white")
                                + path(eave[0], "none", "white", eave[1])
                                + path("M66 33V17l6-2 6 2v22zM64 16l8-2 8 2-2 2-12 1z", "white"))
    master(name, 96, 128, layers)


def terrain():
    top = "M8 18H152V31Q140 30 130 33T101 32T65 34T39 32T8 31Z"
    lip = "M8 30Q25 30 40 32T66 32T100 31T130 32T152 30V39Q134 42 118 40T89 44T54 43T23 42L8 39Z"
    soil = "M8 30H152V48Q129 50 103 49T61 53T30 49T8 48Z"
    rng = random.Random(9)
    blades = "".join(path(f"M{x} {y:.1f}l-{rng.uniform(.6,2):.1f} -{rng.uniform(1,3):.1f}m0 0",
                           "none", rng.choice(["#a9a171", "#6f7756", "#c4ad76"]), .5, .65)
                     for x in range(9, 152) for y in [rng.uniform(21, 29)])
    master("grass-soil", 160, 62, {
        "soil": wash("soilwash", soil, "#796b56", ["#50473b", "#b09b79", "#c2b48c"], (8, 32, 152, 53), 52),
        "grass": wash("grasswash", top, "#838763", ["#b5ad74", "#4e6452", "#bda56f"], (8, 18, 152, 35), 53) + blades,
        "front-lip": wash("lipwash", lip, "#8f805d", ["#585644", "#c3aa7c", "#667b55"], (8, 29, 152, 44), 54)
                     + path("M8 32Q23 31 41 34T70 34T100 33T133 34L152 32", "none", "#b1a374", .9, .7),
        "mask-support": path(top, "white") + path(soil, "white"),
        "mask-front-lip": path(lip, "white"),
    })
    lane = "M8 17Q69 16 102 17H152V25Q107 26 75 25T8 25Z"
    wet = path("M21 20q15-2 34 0t-6 1H30zM86 22q18-2 42-2l-6 1-18 2z", "#d0c7a9", opacity=.58)
    master("narrow-lane", 160, 38, {
        "paving": wash("lanewash", lane, "#8e8576", ["#574f49", "#d1c6a9", "#b8a893"], (8, 16, 152, 26), 62, 390)
                  + path("M8 24.5Q45 23 75 25T152 24.5", "none", "#6f6758", .7),
        "wet": wet,
        "mask-coverage": path(lane, "white"),
        "mask-wetness": path("M21 20q15-2 34 0t-6 1H30zM86 22q18-2 42-2l-6 1-18 2z", "white", opacity=.67),
    })
    step = "M12 10H84V32H61V27H37V22H12Z"
    masonry = []
    for y in (15, 20, 25, 30):
        masonry.append(path(f"M12 {y}H84", "none", "#544f45", .66))
        for x in range(15 + y % 3, 84, 7):
            masonry.append(path(f"M{x} {y-5}l1 5", "none", "#61574d", .54))
    master("stepped-foundation", 96, 44, {
        "masonry": wash("stonewash", step, "#8c806f", ["#c8baa0", "#47463e", "#a29b78"], (12, 10, 84, 32), 71)
                   + f'<g clip-path="url(#stonewash)">{"".join(masonry)}</g>'
                   + path("M12 10H84v2H12z", "#ada087"),
        "mask-support": path(step, "white"),
    })


def mist():
    definitions = ('<defs><radialGradient id="fog"><stop offset="0" stop-color="white"/>'
                   '<stop offset=".49" stop-color="white" stop-opacity=".74"/>'
                   '<stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient></defs>')
    rng = random.Random(101)
    density = "".join(ellipse(round(x, 2), round(y, 2), rx, ry, "url(#fog)", opacity)
                      for x, y, rx, ry, opacity in [(113, 50, 102, 29, .64), (264, 54, 121, 34, .74),
                                                   (378, 46, 113, 27, .60)])
    noise = "".join(ellipse(round(rng.uniform(26, 471), 2), round(rng.uniform(24, 81), 2),
                            rng.randrange(4, 26), rng.randrange(2, 9), "url(#fog)", .12)
                    for _ in range(74))
    master("mist-sheet", 512, 110, {
        "mist": definitions + f'<g opacity=".54">{density}</g>',
        "mask-density": definitions + density,
        "mask-falloff": definitions + ellipse(256, 55, 249, 49, "url(#fog)", 1),
        "mask-noise": definitions + noise,
    })


def landscape():
    """Paint the calibration backdrop, including generator-owned terrain and access."""
    rng = random.Random(2026)
    w, h = 1920, 1080
    sky = ('<defs><linearGradient id="sky" x2="0" y2="1">'
           '<stop stop-color="#9daeb6"/><stop offset="1" stop-color="#e2ddcb"/></linearGradient>'
           '<radialGradient id="cloud"><stop stop-color="#f3ede0" stop-opacity=".44"/>'
           '<stop offset="1" stop-color="#f3ede0" stop-opacity="0"/></radialGradient></defs>')
    sky += rect(0, 0, w, h, "url(#sky)")
    for _ in range(32):
        sky += ellipse(rng.randrange(w), rng.randrange(0, 450), rng.randrange(120, 410),
                       rng.randrange(20, 115), "url(#cloud)", .8)
    ridges = []
    for index, (rise, color, shade) in enumerate([
        (270, "#9ba8a9", "#e3dfcf"), (364, "#8b9b9d", "#bec5be"),
        (450, "#818f8a", "#bac0ab"), (570, "#888f77", "#bfbea2"),
    ]):
        samples = [rise + rng.randrange(-105, 106) for _ in range(12)]
        d = f"M-20 {samples[0]}"
        for i in range(1, 12):
            start = -20 + 180*(i-1)
            d += f"C{start+72} {samples[i-1]} {start+108} {samples[i]} {start+180} {samples[i]}"
        d += "V1100H-20Z"
        ridges.append(wash(f"ridge-{index}", d, color, [shade, "#5e6d68"],
                          (0, rise-90, 1920, rise+190), 90+index, 1400))
        for i in range(1, 11):
            x0 = -20 + 180*(i-1)
            for _ in range(37):
                t = rng.random()
                x = x0 + t*180
                y = samples[i-1] + (samples[i]-samples[i-1])*(3*t*t-2*t*t*t)
                y += rng.uniform(3, 72)
                ht = rng.uniform(3, 12+index*2)
                ridges.append(path(f"M{x:.1f} {y-ht:.1f}l{-ht*.25:.1f} {ht:.1f}h{ht*.52:.1f}z",
                                   "#485e56", opacity=rng.uniform(.10, .26)))
    hill = "M0 538Q180 493 332 545Q472 583 526 645H767L839 668Q899 679 940 711H1065Q1250 788 1420 809T1920 877V1080H0Z"
    field = wash("hill", hill, "#9b9677", ["#514e38", "#cac69b", "#a27b56", "#718465"],
                 (0, 501, 1920, 1080), 205, 6700)
    field += path("M0 686Q291 640 422 698Q635 772 816 791Q1067 818 1303 970T1920 1063V1080H0Z",
                  "#aa9470", opacity=.53)
    field += path("M0 934Q177 862 412 911T812 975Q1169 1062 1458 1080H0Z", "#777c62", opacity=.57)
    traces = []
    for _ in range(5200):
        x, y = rng.uniform(0, w), rng.uniform(510, h)
        length = rng.uniform(1, 11)
        traces.append(path(f"M{x:.1f} {y:.1f}q{length*.4:.1f} -2 {length:.1f} -1", "none",
                           rng.choice(["#594f3c", "#d4c197", "#7c8464", "#ccb193"]), .7, .35))
    for band in range(9):
        y = 727 + band * 38
        traces.append(path(f"M-10 {y}Q190 {y-63} 386 {y-12}T759 {y+70}T1306 {y+203}T1930 {y+318}",
                           "none", "#c5b28b", rng.randint(2, 8), .31))
    field += f'<g clip-path="url(#hill)">{"".join(traces)}</g>'
    rear = "M245 512Q264 508 275 505H316L321 516H411Q432 529 426 549L472 552L501 582L375 575L272 542Z"
    rear_shelf = wash("rear-shelf", rear, "#8d9075", ["#646e59", "#b6ad86"],
                      (245, 505, 501, 582), 63, 500)
    rear_shelf += path("M245 512L275 506H316L321 518H411Q430 534 426 552H471L501 582",
                       "none", "#b4aa96", 5)
    road = ("M0 550Q193 501 333 553Q463 590 526 649H766Q797 651 840 674"
            "T940 715H1070Q1251 790 1421 815T1920 882")
    access = (path(road, "none", "#615d52", 11) + path(road, "none", "#aaa08b", 8)
              + path(road, "none", "#d0c5ad", 1.5, .63))
    # The last row and the cottage have distinct landings joined by the contour route.
    access += path("M985 712h25", "none", "#c8baa0", 3)
    (ROOT / "sources" / "calibration-landscape.svg").write_text(
        f'<svg xmlns="{SVG}" xmlns:inkscape="{INK}" width="{w}" height="{h}" viewBox="0 0 {w} {h}">\n'
        + "\n".join(f'<g inkscape:groupmode="layer" inkscape:label="{name}">{art}</g>'
                    for name, art in [("Sky", sky), ("Distant ridges", "".join(ridges)),
                                      ("Rear shelf", rear_shelf), ("Hillside", field),
                                      ("Contour route", access)]) + '</svg>\n')

    plants = []
    for x, y, size in [(48, 548, 39), (110, 528, 48), (190, 526, 29), (268, 537, 37),
                       (303, 551, 27), (389, 584, 31), (490, 630, 42), (810, 665, 27),
                       (877, 691, 34), (917, 704, 25), (1100, 734, 23), (1142, 751, 40),
                       (1211, 778, 25), (1278, 804, 27), (1390, 826, 30), (1584, 850, 25),
                       (1761, 875, 36), (99, 850, 51), (232, 883, 30), (1678, 1009, 57)]:
        trunk = (path(f"M{x} {y}l-3 {-size}m2 {size*.43}l{-size*.42} {-size*.37}"
                      f"m{size*.42} {size*.37}l{size*.38} {-size*.53}",
                      "none", "#655844", max(1.2, size/20), .85))
        crown = []
        hue = rng.choice([("#aa7959", "#b99161", "#785f4b"), ("#a78a54", "#c5a571", "#7b805c"),
                          ("#72785d", "#929063", "#b3a372")])
        for _ in range(size*11):
            angle = rng.uniform(0, math.tau)
            distance = math.sqrt(rng.random())
            px = x + math.cos(angle) * distance * size*.74
            py = y-size*.91 + math.sin(angle) * distance * size*.7
            dot = rng.uniform(.45, size*.09)
            crown.append(ellipse(round(px, 2), round(py, 2), round(dot, 2), round(dot*.77, 2),
                                 rng.choice(hue), rng.choice([.23, .37, .50])))
        plants.append(trunk + "".join(crown))
    (ROOT / "sources" / "calibration-trees.svg").write_text(
        f'<svg xmlns="{SVG}" xmlns:inkscape="{INK}" width="{w}" height="{h}"><g inkscape:groupmode="layer" '
        f'inkscape:label="Orchard and roadside trees">{"".join(plants)}</g></svg>\n')


def raster(svg, png):
    subprocess.run(["inkscape", str(svg), "--export-area-page", "--export-filename", str(png)],
                   check=True, capture_output=True)


def export_asset(source, directory):
    doc = ET.parse(source)
    outputs = {}
    for group in list(doc.getroot()):
        label = group.attrib["id"]
        with tempfile.TemporaryDirectory() as temp:
            isolated = Path(temp) / "layer.svg"
            tmp_png = Path(temp) / "layer.png"
            for sibling in doc.getroot():
                sibling.set("style", "" if sibling is group else "display:none")
            doc.write(isolated, encoding="utf-8")
            raster(isolated, tmp_png)
            with Image.open(tmp_png) as image:
                if label.startswith("mask-"):
                    image.getchannel("A").save(directory / f"{label}.png")
                else:
                    image.convert("RGBA").save(directory / f"{label}.png",
                                               pnginfo=SRGB)
        outputs[label] = f"png/{source.stem}/{label}.png"
    return outputs


SRGB = PngInfo()
SRGB.add(b"sRGB", b"\0")


def source_uv(values, size):
    return [n / d for n, d in zip(values, size)]


def manifest():
    specs = [
        ("cafe", "shell", "historic_plaster", "cafe", (96, 128), (48, 116), (72, 105), .63, ["REF-L05", "REF-T01"]),
        ("bookshop", "shell", "historic_plaster", "bookshop", (96, 128), (48, 116), (72, 102), .63, ["REF-L05", "REF-U03"]),
        ("cottage", "shell", "detached_plaster", "residential", (96, 128), (48, 116), (69, 102), .57, ["REF-S09", "REF-L10"]),
        ("grass-soil", "ground", "autumn_grass", "support", (160, 62), (8, 18), (144, 35), .44, ["REF-L05", "REF-S09"]),
        ("narrow-lane", "street", "wet_gravel", "walking_lane", (160, 38), (8, 21), (144, 8), .50, ["REF-S09", "REF-L10"]),
        ("stepped-foundation", "foundation", "fieldstone", "support", (96, 44), (48, 10), (72, 22), .63, ["REF-L05"]),
        ("mist-sheet", "weather", "rolling_mist", "band_gap", (512, 110), (256, 55), (498, 98), 0, ["REF-L05", "REF-L10"]),
    ]
    assets = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        jobs = {}
        for name, *_ in specs:
            directory = ROOT / "png" / name
            directory.mkdir(parents=True, exist_ok=True)
            jobs[name] = pool.submit(export_asset, ROOT / "sources" / f"{name}.svg", directory)

        for name, family, style, use, size, pivot, span, depth, refs in specs:
            files = jobs[name].result()
            order = [label for label in files if not label.startswith(("mask-", "motion-")) and label not in {"wet", "unlit"}]
            if "motion-00" in files:
                order.insert(order.index("glass-1"), "motion-00")
            alpha = Image.new("L", tuple(2*n for n in size))
            for label, filename in files.items():
                with Image.open(ROOT / filename) as layer:
                    coverage = layer if label.startswith("mask-") else layer.getchannel("A")
                    alpha = ImageChops.lighter(alpha, coverage)
            x0,y0,x1,y1 = alpha.getbbox()
            width = span[0] / 72
            footprint = [[-width/2, 0], [width/2, 0], [width/2, depth], [-width/2, depth]]
            if family in ("ground", "street"):
                footprint = [[0, 0], [width, 0], [width, depth], [0, depth]]
            asset = {
                "asset_id": f"townscape.b01.{name}", "version": 1, "family": family,
                "style_family": style, "use_tags": [use],
                "tags": [family, style, use], "reference_ids": refs,
                "source": f"sources/{name}.svg", "provenance": "original / CC0-1.0",
                "world_width_f": width, "world_height_f": span[1] / 72,
                "footprint_f": footprint if family != "weather" else None,
                "source_dimensions_px": [2*n for n in size], "trim_rect_px": [x0,y0,x1-x0,y1-y0],
                "pivot_uv": source_uv(pivot, size), "reference_frontage_px": 72,
                "authored_scale": 2, "alpha": "straight", "color_space": "srgb",
                "mask_color_space": "linear", "can_mirror": False, "files": files,
                "layer_order": order, "states": ["base"] + [k for k in ("wet", "unlit") if k in files],
            }
            if family == "shell":
                attached = name != "cottage"
                left, right = (12, 84) if attached else (13, 82)
                door = 67 if attached else 48
                asset["tags"] += ["attached" if attached else "detached", "two_storey"]
                asset["ground_span_uv"] = [source_uv((x, 116), size) for x in (left, right)]
                asset["footprint_f"] = [[(x-pivot[0])/72, d]
                                        for x, d in [(left, 0), (right, 0), (right, depth), (left, depth)]]
                asset["foundation_modes"] = ["level_plinth", "stepped_plinth"] if attached else ["level_plinth"]
                asset["entrance"] = {
                    "threshold_uv": source_uv((door, 116), size),
                    "clearance_f": {"width": 12/72, "depth": .22},
                    "approach": "front",
                    "mask": "mask-entrance",
                }
                asset["sockets"] = {
                    "entrance": {"uv": asset["entrance"]["threshold_uv"],
                                 "accepts": ["shop_door" if attached else "domestic_door"]},
                }
                asset["semantic_anchors"] = {
                    "pick_uv": source_uv((48, 77), size),
                    "sound_uv": source_uv((35 if attached else 48, 91), size),
                }
                asset["wall_contacts"] = {
                    side: {"profile": "historic-shared-73", "span_uv": [source_uv((x, y), size) for y in (43, 116)]}
                    for side,x in [("left", 12), ("right", 84)] if attached}
                if attached:
                    asset["sockets"]["storefront"] = {
                        "uv": source_uv((48, 69), size), "accepts": ["shopfront-b01-64"],
                        "excludes": ["domestic_door"],
                    }
                    asset["rooms"] = [{
                        "room_id": "front-room", "backing": "room-backing", "frame": "frame",
                        "pane_order": ["left", "right"],
                        "panes": {side: {"glass": f"glass-{index}", "clip_mask": f"mask-pane-{index}",
                                          "bounds_uv": source_uv(p, size*2)}
                                  for index, (side, p) in enumerate(zip(("left", "right"), PANE), 1)},
                        "motion": {"frames": [f"motion-{i:02}" for i in range(8)], "frame_duration_ms": 200,
                                   "loop": True} if name == "cafe" else None,
                        "unlit_overlay": "unlit", "unlit_before": "glass-1",
                    }]
            if family in ("ground", "street"):
                asset["joins"] = {
                    label: {"profile": "grass-shelf-18" if family == "ground" else "gravel-lane-8",
                            "uv": source_uv((x, pivot[1]), size)}
                    for label, x in [("start", 8), ("end", 152)]
                }
                asset["allowed_slope_deg"] = [-8, 8]
                asset["support_modes"] = ["level_shelf", "contour"]
            if family == "foundation":
                asset["compatible_footprint_f"] = [1, .63]
                asset["supported_mode"] = "stepped_plinth"
                asset["top_span_uv"] = [source_uv((x, 10), size) for x in (12, 84)]
                asset["terrain_steps_uv"] = [[source_uv((x, y), size) for x in (start, end)]
                                             for start, end, y in [(12, 37, 22), (37, 61, 27), (61, 84, 32)]]
            if family == "weather":
                asset["distribution"] = {
                    "tile_axes": [], "repeat": "nonperiodic-overlap", "drift_axis": "x",
                    "transparent_padding_px_min": 12, "band_gaps": ["far-to-middle", "middle-to-near"],
                    "opacity_range": [.12, .45], "density": "mask-density", "falloff": "mask-falloff",
                    "noise": "mask-noise",
                }
            assets.append(asset)
    result = {"schema_version": 1, "pack_version": "1.0.0",
              "units": {"world": "frontage_units", "source_anchors": "normalized_uv_top_left_y_down",
                        "world_axes": {"x": "along_panorama", "d": "away_from_viewer", "h": "up"}},
              "assets": assets}
    (ROOT / "manifest.v1.json").write_text(json.dumps(result, indent=2) + "\n")
    return {asset["asset_id"].rsplit(".", 1)[1]: asset for asset in assets}


def load(asset, label):
    with Image.open(ROOT / asset["files"][label]) as image:
        return image.copy()


def compose(asset, include_shadow=True, wet=False, motion=None):
    canvas = Image.new("RGBA", asset["source_dimensions_px"])
    for label in asset["layer_order"]:
        if label == "shadow" and not include_shadow:
            continue
        if label == "motion-00" and motion is not None:
            label = motion
        canvas.alpha_composite(load(asset, label))
    if wet and "wet" in asset["files"]:
        canvas.alpha_composite(load(asset, "wet"))
    return canvas


def project(image, asset, point, scale):
    w, h = image.size
    px, py = asset["pivot_uv"]
    size = (round(w * scale / 2), round(h * scale / 2))
    position = (round(point[0] - size[0] * px), round(point[1] - size[1] * py))
    return image.resize(size, Image.Resampling.LANCZOS), position


def art_preview(assets, fixture):
    with tempfile.TemporaryDirectory() as temp:
        bmp = Path(temp) / "layer.png"
        raster(ROOT / "sources/calibration-landscape.svg", bmp)
        with Image.open(bmp) as image:
            scene = image.convert("RGBA")
        raster(ROOT / "sources/calibration-trees.svg", bmp)
        with Image.open(bmp) as image:
            trees = image.convert("RGBA")

    def place(canvas, asset_id, point, scale, opacity=1):
        asset = assets[asset_id]
        image, position = project(compose(asset, wet=True), asset, point, scale)
        if opacity != 1:
            image.putalpha(image.getchannel("A").point(lambda x: round(x * opacity)))
        canvas.alpha_composite(image, position)

    scene.alpha_composite(trees)
    for item in fixture["placement"][:4]:
        place(scene, item["asset"], item["pivot_px"], item["scale"])
    for position, scale, opacity in [((220, 471), 1.8, .62), ((872, 577), 2.3, .56), ((1592, 638), 2.0, .65)]:
        place(scene, "mist-sheet", position, scale, opacity)

    # A shared rain pass stays identical across the two assemblies.
    rain = Image.new("RGBA", scene.size)
    draw = ImageDraw.Draw(rain)
    rng = random.Random(673)
    for _ in range(2700):
        x, y = rng.randrange(1920), rng.randrange(1080)
        length = rng.randrange(5, 19)
        draw.line((x, y, x-3, y+length), fill=(234, 234, 218, rng.randrange(10, 44)))
    for name in fixture["swap_candidates"]:
        variant = scene.copy()
        for item in fixture["placement"][4:]:
            asset_id = name if item["id"] == "swap-slot" else item["asset"]
            place(variant, asset_id, item["pivot_px"], item["scale"])
        variant.alpha_composite(rain)
        for w, h in [fixture["viewport_px"], fixture["reduced_viewport_px"]]:
            image = variant.convert("RGB").resize((w, h), Image.Resampling.LANCZOS)
            image.save(ROOT / "preview" / f"slope-{name}-{w}x{h}.png", pnginfo=SRGB)


def contact_sheet(assets):
    width, height = 960, 452
    sheet = Image.new("RGB", (width, height), "#e4dece")
    draw = ImageDraw.Draw(sheet)
    regular = ImageFont.truetype("DejaVuSans.ttf", 12)
    title = ImageFont.truetype("DejaVuSerif.ttf", 25)
    draw.text((22, 16), "Townscape · Batch 1", font=title, fill="#31352d")
    draw.text((23, 50), "Near-plane scale  /  72 px per frontage unit", font=regular, fill="#4c5148")
    entries = [("cafe", "Café"), ("bookshop", "Bookshop"), ("cottage", "Cottage"),
               ("grass-soil", "Grass + soil / front lip"), ("narrow-lane", "Wet gravel lane"),
               ("stepped-foundation", "Stepped foundation")]
    for row, background in [(0, "#d2c9b4"), (1, "#464b45")]:
        color = "#383b32" if row == 0 else "#ede4cc"
        for i, (key, label) in enumerate(entries):
            x, y = 18 + i * 154, 79 + row * 142
            draw.rectangle((x, y, x+148, y+135), fill=background)
            layer = compose(assets[key], wet=True)
            layer = layer.resize((layer.width//2, layer.height//2), Image.Resampling.LANCZOS)
            # Crop only for the swatch; size remains at the display scale.
            layer = layer.crop(layer.getbbox())
            sheet.paste(layer, (x + (149-layer.width)//2, y + 110-layer.height), layer)
            draw.text((x+5, y+117), label, font=regular, fill=color)
    draw.rectangle((18, 371, 942, 435), fill="#6c7773")
    fog = compose(assets["mist-sheet"])
    fog = fog.resize((fog.width//2, fog.height//2), Image.Resampling.LANCZOS)
    sheet.paste(fog, (230, 347), fog)
    draw.text((28, 403), "Mist sheet", font=regular, fill="#eee6d2")
    sheet.save(ROOT / "preview/contact-sheet.png", pnginfo=SRGB)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--redraw", action="store_true", help="regenerate the SVG masters from the Python drawing recipe")
    options = parser.parse_args()
    for folder in ["sources", "png", "preview"]:
        (ROOT / folder).mkdir(exist_ok=True)
    if options.redraw:
        shell("cafe", "cafe", "#c7af8e", "#8a6155", "#586958")
        shell("bookshop", "bookshop", "#bfa480", "#647071", "#745b52")
        shell("cottage", "home", "#c9bd9d", "#886b55", "#63746a")
        terrain()
        mist()
        landscape()
    assets = manifest()
    fixture = json.loads((ROOT / "calibration.v1.json").read_text())
    art_preview(assets, fixture)
    contact_sheet(assets)


if __name__ == "__main__":
    main()
