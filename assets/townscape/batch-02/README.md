# Townscape Batch 2

The vertical slice includes **14 shell designs**, with three from Batch 1 and eleven new designs. All artwork in this batch, including the hillside's editable terrain and distant woodland, is original and released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Reference IDs live in the asset records.

| Review material | Location |
| --- | --- |
| Shell and component inventory on light and dark grounds | [Shells](preview/shell-contact.png) · [Terrain and details](preview/kit-contact.png) |
| Main hillside assembly | [Wet with mist, 1920 × 1080](preview/hillside-wet-mist-1920x1080.png) · [Wet with mist, 960 × 540](preview/hillside-wet-mist-960x540.png) |
| Weather comparison at 960 × 540 | [Wet, clear](preview/hillside-wet-clear-960x540.png) · [Dry, with mist](preview/hillside-dry-mist-960x540.png) · [Dry, clear](preview/hillside-dry-clear-960x540.png) |
| Grounded storefront swap and access | [Bookshop in the café slot](preview/hillside-bookshop-960x540.png) · [Lanes, stairs and threshold connections](preview/hillside-routes-960x540.png) |
| Editable and runtime artwork | [Layered SVGs](sources/) · [Color PNGs and grayscale masks](png/) · [Versioned manifest](manifest.v1.json) |
| Browser review | **Hillside preview** from the Fog pilot, or [townscape.html](../../../townscape.html) via Vite |

## Inventory

| Family | Shells | Compatibility in the fixture |
| --- | --- | --- |
| Historic attached | Café, bookshop, gable house, weavers' house, corner house, bakery | The shared wall profile crosses 73 near-plane pixels. The four new historic shells have independently selectable left and right end faces. |
| Detached | Cottage, garden villa, stone cottage | Individual pivots and setbacks on level shelves. |
| Modern | Brick infill, garden walk-up | The brick infill shares both historic wall contacts and has both end faces. The walk-up occupies its own lot. |
| Rural and civic | Barn, school, inn | The barn occupies the far contour lane. The middle school shares a street with its play yard. The near inn has its own shelf. |

The five reusable façade components are a stone sill, historic sash, modern ribbon window, panel door and bakery storefront. The manifest's mounted parts match the receiving sockets by type. The school and inn keep signs editable. A component's aperture mask bounds its light state, and the reusable door and sill retain their pivots when mounted in different shells.

The kit adds a lane bend, a three-way lane join, and stone stairs with two landings. The stairs can face either way. The new rising plinth supports the opposite grade to the Batch 1 plinth, and a level plinth is fitted in the far row. Park, play and plaza surfaces have their own entries and can be dressed with benches, a gate fence, swing and slide, and well. The orchard and field surfaces use separate ground paint. The fir, rowan and split deciduous tree occupy independent packets.

Remaining combinations include other attached corner geometries, stepped supports beyond this frontage module, more lane branches, bridge and bank joins, and further variations on civic and rural buildings. See the [production plan](../../../docs/townscape-asset-production-plan.md).

## Calibrated assembly

The [resolved fixture](hillside.v1.json) holds the terrain supports, walkable graph, building shelves and ordered draw placements. Its far, middle and near scales are 0.53, 0.76 and 1.0 respectively, based on 72 px per frontage unit. Sixteen edges connect the three bands, including three stair flights. The school and its play lot are on the middle lane. The near lane links the historic and modern row to the plaza and park, then continues past gardens and a cottage. Both wet and dry palettes use that layout.

The café and bookshop share wall joins at x = 433 and x = 505. Both have the same threshold and a full-width foundation contact at y = 737. The midpoint of the shop's entrance reaches the near lane five virtual pixels ahead. The verification samples mask coverage at both output sizes. Canvas assembles the contact in a single 1920 × 1080 frame, then resamples that frame for 960 × 540. The playback test captures both rooms in the same slot.

Each mist gap has its own placement, drift phase, density, falloff and noise. The overlook tree's rear crown passes behind the middle-to-near mist, and the trunk and foremost crown draw in the near foreground. Wet weather enables the clipped window glow and animated café interior along with rain and surface highlights. The browser controls allow weather and mist to be reviewed independently of the shop swap.

### Visual review

- The stone flights and shelf breaks communicate grade changes at both sizes. The thin lane reveal and open fields carry the sparse part of the panorama. The retaining cuts and schoolyard approach still benefit from a scale review against the hillside references. [REF-L05, REF-L10 and REF-S09 index](../../../Town-Soundscape-Handoff-v1/documentation/reference-index.csv)
- The western core tapers toward detached and agricultural lots in each band. The brick infill shares the historic frontage scale and keeps its low roof and wide bays. At 960 × 540 the school clock, playground equipment, roof profiles and café opening remain distinguishable. Sign lettering and fine grain read best in the full assembly or contact sheets. [REF-T01, REF-T03 and REF-U03 index](../../../Town-Soundscape-Handoff-v1/documentation/reference-index.csv)
- Before the terrain batch, review the cut height and stair reveal against the target field of view. Confirm memory and overdraw on the target device, then exercise bank, bridge and contour-lane joints through the generated scenes. The browser review uses a fixed resolved scene for asset calibration.

With rain and both mist gaps enabled, the review renderer submits 22 sprite and strip draws per frame. The sample-area estimate is 6.34 million virtual pixels and includes the rain pass. Retained RGBA buffers total approximately 47 MiB at 1920 × 1080 and 41 MiB at 960 × 540. In the verification machine's headless Chromium, steady animation at 960 × 540 measured 19.8 ms median and 23.8 ms at the 95th percentile for Canvas draw submission. The raster estimate covers the app's retained images and buffers. Actual renderer and device memory require a device measurement.

## Import and reproduce

Use the complete untrimmed authoring frame to turn normalized UV pivots and sockets into pixel coordinates. The straight-alpha sRGB PNG layers and linear grayscale masks share that frame at 2×. Keep supplied trims as crop rectangles and apply a common placement transform to the associated layers. Batch 2's manifest includes Batch 1's manifest relative to its own URL. The built review deploys both manifests and their PNG folders under Vite's relative base.

From the repository root, run:

    npm run dev
    npm test
    npm run build
    python -B assets/townscape/batch-01/verify.py
    python -B assets/townscape/batch-02/verify.py

Open **Hillside preview**. Select 1920 × 1080 or 960 × 540, toggle **Wet**, **Mist** and **Routes**, and use **Place bookshop** to exercise the alternate. Preview plates were captured with motion disabled at the starting weather phase. Chromium also exercised motion and both shop swaps on the production build served below a nested path.

With Python 3, Pillow and Inkscape, run **python -B assets/townscape/batch-02/produce.py** to export the edited SVGs and regenerate both inventory sheets. Add **--redraw** when intentionally refreshing the SVG masters from their Python paint recipes. The verifier checks silhouette counts, color and masks, public-lot clearance, the shared grounded seam, and the change in mist on the split tree.
