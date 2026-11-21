# Townscape Batch 1

This pack calibrates the 72 px near-plane frontage unit and the shared authoring contract. The SVG artwork and calibration landscape are original and released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). The handoff plates informed the art direction. All exported scene and sprite pixels come from the Batch 1 sources.

| Deliverable | Files |
| --- | --- |
| Editable art | [Layered Inkscape SVGs](sources/), including the landscape and trees |
| Production layers | [Transparent color PNGs and grayscale masks](png/), indexed by the [v1 manifest](manifest.v1.json) |
| Scene layout | [Calibration fixture](calibration.v1.json) with attached, detached, stepped and reserved civic envelopes |
| Display-size inventory | [Contact sheet on light and dark grounds](preview/contact-sheet.png) |
| Café in center | [1920 × 1080](preview/slope-cafe-1920x1080.png) · [960 × 540](preview/slope-cafe-960x540.png) |
| Bookshop in center | [1920 × 1080](preview/slope-bookshop-1920x1080.png) · [960 × 540](preview/slope-bookshop-960x540.png) |
| Interactive proof | [Shop swap and animated café storefront](calibration.html) via a static server |

## Inventory and compatibility

| Piece | Delivered interface | Coverage to add |
| --- | --- | --- |
| Café and bookshop | Two 1.0 F historic shells with the same left and right wall profile, storefront socket, threshold position and stepped foundation. Each has two glazing layers, an interior and a front frame. The café has eight clipped motion frames. | Exposed end walls, corners, other material families and joins to modern infill. The declared level-plinth mode needs a dedicated assembly. |
| Detached cottage | A 0.96 F shell with its own entrance, shadow and pick and sound anchors. Set apart from the row on a level terrace. | Side returns, pitched-lot support and varied detached silhouettes. |
| Grass and soil | The soil fill, grass surface and front lip have separate exports. The lip has an independent occlusion mask. | Join and return variants and native terrain profiling across grades. |
| Narrow lane | One 2 F gravel segment with a nominal 8 px near-plane reveal, coverage and wetness masks, and two end joins. | Bend, junction and grade joins. The backdrop supplies the long route around this segment. |
| Stepped foundation | One right-descending fieldstone profile sized for the 1 F attached envelope. | Opposite slope and additional rise and span combinations. |
| Mist | One feathered, nonperiodic horizontal drift sheet with density, falloff and noise masks. | Runtime drift, tall-object splitting and per-band occlusion. |

PNG layers retain their full authoring frame at 2× near-plane scale. Color exports use straight-alpha sRGB. Masks are linear grayscale with zero for no coverage. The trim rectangle uses [x, y, width, height] and bounds the union of exported layers and masks. Multiply UVs by the untrimmed source dimensions before applying crop offsets or projection. Resolve every file relative to the manifest. Keep IDs stable when mapping these designs to the pilot catalog.

Follow the manifest's layer order for the lit storefront. Both separately masked panes reference the same room. Replace motion-00 with the selected frame at 200 ms intervals. In the unlit state, skip motion and insert the room's unlit overlay at its declared position. Paint wet accents as overlays. Use the ground lip mask in the foreground pass and the mist masks in inter-band passes. The fixture plates use a static mist sample.

## Calibration result

Both shop thresholds project to (677, 645) and connect to the lane at (677, 649). The shared wall faces meet the neighbors at x = 622 and x = 694. Both shell baselines match the entire top of the stepped foundation. The mask proof found no uncovered seam or ground-contact pixels at either delivered size. Comparing the café and bookshop scene PNGs confined the change to the swap slot, including the small resampling fringe. The existing pilot elevation transform gives the same contact and threshold coordinates after UV conversion.

The reduced plate is downsampled from the assembled scene. Independently rounding layers at half size exposed a one-pixel ground seam at the odd baseline of y = 645. Preserve fractional coordinates across joined layers or reduce the composited band, then test the actual runtime at the reduced viewport. The interactive proof loads the manifest below a URL subpath and animates the café layers in Canvas. The slope plates and fixture are standalone calibration assets for the planned generator integration.

## Review before expanding to 14 shells

1. Review **scale and material readability** at 960 × 540. The roof and storefront silhouettes carry the café/bookshop distinction there. Sign letters, fine roof texture and the café figure are clearer in the contact sheet and enlarged storefront proof. Confirm how much detail needs to read during normal play.
2. Review **terrain and access** against REF-L05 and REF-L10. The level row and descending lane read at reduced size, but the stepped masonry occupies only a thin band. Trial the opposite slope, terrace ends and a stair with landings before committing to more foundations or attached end walls.
3. Review **density and transition** against REF-S09, REF-T01/T03 and REF-U03. The open lane reads as sparse against the hillside. The short attached row thinning into detached cottages demonstrates the transition locally. Review a connected three-band arrangement and historic-to-modern joins before using this palette and frontage rhythm in dense infill.
4. Review **weather and compositing** through the runtime fixture. Test dry/wet and mist on/off, tall-object masking, draw order at both viewport sizes, and memory and overdraw on a target device. The static mist sample shows the intended depth placement.

The three shells count toward the 14-shell total. The next batch has four historic attached, two detached, two modern, one barn, one school and one inn still to author. See the [production plan](../../../docs/townscape-asset-production-plan.md), [generator contract](../../../docs/townscape-world-generator-plan.md#shared-asset-contract) and [handoff reference index](../../../Town-Soundscape-Handoff-v1/documentation/reference-index.csv).

## Reproduce

With Python 3, Pillow and Inkscape installed, run these commands from this directory.

    python export.py
    python -B verify.py
    python -m http.server 8765

Open http://localhost:8765/calibration.html for the motion and swap proof. The default export reads the editable SVG masters. Use **python export.py --redraw** to regenerate the masters from the Python art recipe after making changes there. The verifier checks frames, color tags, padding, masks, wall and foundation coverage, entrance-to-lane registration, motion clipping and both preview pairs.
