"""Paint the hillside assembly's supporting terrain from its resolved profiles."""
import math
import random

from authoring import clip, ellipse, linear_gradient, masonry, path, pigment, rect, svg, wash

WIDTH, HEIGHT = 1920, 1080


def smooth_ridge(samples):
    d = f"M{samples[0][0]} {samples[0][1]}"
    for (x0, y0), (x1, y1) in zip(samples, samples[1:]):
        dx = x1-x0
        d += f"C{x0+dx*.36:.1f} {y0:.1f} {x1-dx*.36:.1f} {y1:.1f} {x1:.1f} {y1:.1f}"
    return d


def ridge_height(xs, x):
    for (a, y0), (b, y1) in zip(xs, xs[1:]):
        if x <= b:
            t = max(0, (x-a)/(b-a))
            return y0 + (y1-y0)*t*t*(3-2*t)
    return xs[-1][1]


def woodland(ridge, seed, count, tones, depth, scale):
    rng = random.Random(seed)
    shapes = []
    for _ in range(count):
        x = rng.randrange(-12, WIDTH+12)
        root = ridge_height(ridge, x) + rng.uniform(4, depth)
        drift = .44 + .26*math.sin(x*.041) + .18*math.cos(x*.025) + .18*math.cos(root*.13)
        if rng.random() > drift:
            continue
        h = scale * rng.uniform(.46, 1.55)
        a = h*rng.uniform(.17, .31)
        silhouette = (f"M{x:.1f} {root-h:.1f}l{a*.46:.1f} {h*.41:.1f}h{-a*.18:.1f}"
                      f"l{a*.6:.1f} {h*.24:.1f}h{-a*.31:.1f}"
                      f"l{a*.5:.1f} {h*.27:.1f}q{-a:.1f} {h*.12:.1f} {-a*2.1:.1f} 0"
                      f"l{a*.57:.1f} {-h*.29:.1f}h{-a*.3:.1f}l{a*.67:.1f} {-h*.24:.1f}"
                      f"h{-a*.25:.1f}z")
        shapes.append(path(silhouette, rng.choice(tones), opacity=f"{rng.uniform(.1, .38):.2f}"))
    return "\n".join(shapes)


def distant_washes():
    sky = linear_gradient("sky-wash", "#99aab1", "#e4dac4") + rect(0, 0, WIDTH, HEIGHT, "url(#sky-wash)")
    sky += ('<defs><radialGradient id="sky-cloud"><stop stop-color="#f3ead8" stop-opacity=".78"/>'
            '<stop offset=".5" stop-color="#e3e1cf" stop-opacity=".48"/>'
            '<stop offset="1" stop-color="#e3e1cf" stop-opacity="0"/></radialGradient>'
            '<radialGradient id="blue-cloud"><stop stop-color="#728997" stop-opacity=".50"/>'
            '<stop offset="1" stop-color="#728997" stop-opacity="0"/></radialGradient></defs>')
    rng = random.Random(39277)
    for i in range(41):
        x, y = rng.randrange(-250, 2230), rng.randrange(-55, 400)
        sky += ellipse(x, y, rng.randrange(120, 550), rng.randrange(21, 117),
                       "url(#sky-cloud)" if i % 3 else "url(#blue-cloud)", rng.uniform(.31, .72))
    ranges = [
        ([241, 267, 247, 285, 260, 188, 230, 183, 254, 232, 176, 253], "#a1acac", "#cbcbbb", "#697f84", 6),
        ([272, 295, 275, 332, 362, 340, 272, 280, 302, 274, 324, 247], "#879d9e", "#b2b9ac", "#687e80", 8),
        ([359, 317, 359, 350, 396, 390, 377, 360, 316, 360, 332, 345], "#85978e", "#a9b0a0", "#647f76", 9),
        ([384, 368, 395, 431, 419, 427, 472, 451, 400, 397, 437, 414], "#899781", "#b2ad93", "#637866", 13),
        ([457, 421, 438, 453, 488, 516, 504, 514, 557, 534, 520, 505], "#909575", "#aaa486", "#657860", 15),
    ]
    for i, (ys, base, fade, tree, height) in enumerate(ranges):
        samples = [(x*180-32, y) for x, y in enumerate(ys)]
        ridge = smooth_ridge(samples)
        shape = ridge + "V1080H-32Z"
        bounds = (0, min(ys)-5, WIDTH, max(ys)+109)
        grad = linear_gradient(f"ridge-wash-{i}", base, fade)
        sky += grad + wash(f"range-{i}", shape, f"url(#ridge-wash-{i})", bounds, [base, fade, tree], 90+i, 3700, 2.5)
        sky += clip(f"forest-{i}", shape, woodland(samples, 76+i, 2300, [tree, base, fade], 87+i*13, height))
        sky += path(ridge, "none", fade, .9, .36)
        if i < 4:
            for x in range(-100, WIDTH+200, 320):
                height = ridge_height(samples, x)
                sky += ellipse(x, height+55, 275, 43+i*3, "url(#sky-cloud)", .25)
    # Fields retreating through the valley. Texture and the distant fold are scenic rather than a street packet.
    valley = "M1104 541Q1322 551 1455 520Q1680 488 1920 533V922H1098Z"
    sky += wash("remote-valley", valley, "#a0a082", (1100, 500, 1920, 780),
                ["#768465", "#c4b08d", "#9f8a6e"], 107, 3200, 2.7)
    for index in range(13):
        y = 546+index*11
        sky += path(f"M1101 {y+42}Q1344 {y+39} 1543 {y+4}T1920 {y+18}",
                    "none", ["#c4b586", "#879472", "#b2a18b"][index%3], 1+index*.18, .55)
    return sky


def terrain(band, index):
    key = band["id"]
    profile = band["support_profile_px"]
    ridge = "M" + "L".join(f"{x} {y}" for x, y in profile)
    shape = ridge + "V1080H0Z"
    lowest = min(p[1] for p in profile)
    outlines = [
        ("#969774", "#ab9d7e", "#6b785e", "#c9bb95", "#836c55"),
        ("#9a9971", "#a89873", "#6d795b", "#c1b089", "#846e56"),
        ("#9a906d", "#aa936c", "#777a59", "#ceb38a", "#7e6d53"),
    ]
    base, shade, dark, pale, earth = outlines[index]
    land = linear_gradient(f"land-{key}", base, shade)
    land += wash(f"pigment-{key}", shape, f"url(#land-{key})", (0, lowest-5, WIDTH, HEIGHT),
                 [dark, pale, earth], 447+index, 8100 if key=="near" else 5200, 2.3)
    # Broken edge deposits and thin land-stone strata.
    land += path(ridge, "none", pale, 1.2, .6)
    rng = random.Random(247+index)
    bands = []
    for offs in range(10, 320, 13):
        y = lowest + offs
        bend = 17*math.sin(offs*.035)
        color = rng.choice([earth, pale, base, dark])
        bands.append(path(f"M-31 {y+55}Q147 {y+12} 299 {y+16}T573 {y+14+bend:.1f}"
                          f"Q764 {y+3} 1002 {y+48}T1437 {y+93}T1932 {y+136}",
                          "none", color, rng.uniform(1.2, 5.5), rng.uniform(.13, .45)))
    if key == "near":
        meadow = ("M0 890Q134 829 330 858Q529 864 691 895Q860 931 1049 929"
                  "Q1470 966 1920 1010V1080H0Z")
        bands.append(wash("foreground-meadow", meadow, "#a89b72", (0, 844, WIDTH, HEIGHT),
                          [pale, earth, dark], 469, 8300, 2.4))
        for i in range(7):
            y = 895+i*29
            bands.append(path(f"M-10 {y}Q175 {y-49} 408 {y-13}T832 {y+63}Q1100 {y+96} 1315 {y+127}",
                              "none", pale if i%2==0 else earth, 2+i*.15, .46))
        banks = [
            ("M278 748H742L761 752V766Q595 755 488 760Q373 763 280 767Z", (278, 749, 761, 767)),
            ("M101 758Q192 737 234 750l8 14q-70-10-146 5z", (96, 745, 243, 773)),
            ("M995 768Q1078 759 1147 776l-8 11q-84-19-145-6z", (989, 761, 1151, 790)),
        ]
    elif key == "middle":
        banks = [
            ("M193 581H475Q524 580 555 578l5 10q-44 8-94 7H247l-46-5z", (193, 579, 562, 598)),
            ("M629 627H1186l6 16q-132-2-230-3-217 4-322 0z", (627, 626, 1194, 644)),
        ]
    else:
        banks = [("M92 499H349l56 12v11q-73-14-130-12H97Z", (91, 497, 407, 523))]
    for i, (form, bounds) in enumerate(banks):
        bands.append(wash(f"bank-{key}-{i}", form, "#8f816c", bounds, [dark, pale, earth], i+179, 500, 1.2))
        bands.append(clip(f"banks-{key}-{i}", form, masonry(tuple(round(n) for n in bounds), (11, 4),
                                                            earth, i+34, .58)))
        bands.append(path(form, "none", "#bdab86", .55, .67))
    # Broken brush clusters are strongest where a field rises into the foreground.
    marks = []
    for _ in range(4900 if key=="near" else 2700):
        x, y = rng.uniform(0, WIDTH), rng.uniform(lowest, HEIGHT if key=="near" else lowest+160)
        length = rng.uniform(1.5, 10 if key=="near" else 5)
        angle = rng.uniform(-.5, 1.5)
        color = rng.choice([dark, pale, earth, "#c3a371"])
        marks.append(path(f"M{x:.1f} {y:.1f}l{length*angle:.1f} {-length*.5:.1f}", "none", color,
                          rng.uniform(.35, 1.05), rng.uniform(.16, .47)))
    land += clip(f"terrain-{key}", shape, "\n".join(bands+marks))
    return land


def backdrop(fixture):
    layers = {"sky": distant_washes()}
    for i, band in enumerate(fixture["bands"]):
        layers[band["id"]] = terrain(band, i)
    svg("landscape", (WIDTH, HEIGHT), layers, scale=1)
