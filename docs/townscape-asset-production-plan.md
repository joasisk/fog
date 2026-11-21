# Townscape asset production plan

The [Town Soundscape Handoff v1](../Town-Soundscape-Handoff-v1/README.md) supplies the visual direction and proposed production budgets. Its concept plates are full-scene comparisons. Author reusable layers from the visual rules in the [art and generation guide](../Town-Soundscape-Handoff-v1/documentation/Art-and-Generation-Guide.md) and track quantities against the [asset budget](../Town-Soundscape-Handoff-v1/documentation/asset-budget.csv). Use the [reference index](../Town-Soundscape-Handoff-v1/documentation/reference-index.csv) to find the current plates by ID.

## Visual targets

- Frame at 1920 × 1080 virtual pixels, with one near frontage unit (F) starting at 72 virtual pixels. Keep the house scale consistent across dense and rural scenes. Start ordinary two-storey shells around 0.65–1.35 F wide and 1.0–1.6 F high.
- Use REF-T01/T03 for a core that opens toward gardens and fields across depth, REF-L05 for buildings on visible terraces and stairs, REF-U03 for modern infill at historic frontage scale, and REF-S09/L10 for a landscape-dominated lane. REF-U02 is a density comparison.
- Paint rainy autumn color in muted watercolor washes. Keep verticals upright, road reveals narrow and partly screened, silhouettes legible at display size, signage restrained and paper grain consistent across pieces. Match material scale across shells. Reserve the strongest warm accents for occasional windows, signs and autumn plants.

## Production batches

| Batch | Author | Review gate |
| --- | --- | --- |
| 1. Shared calibration | Two compatible attached shop shells for a café and bookshop, one detached shell, one grass/soil support treatment with a front lip and one narrow lane piece. Supply one animated storefront with room and pane metadata, a contact shadow, a stepped foundation and a sample mist sheet. | Assemble one slope-side frontage at full and reduced size. Swap the café and bookshop in the same envelope. Confirm scale, anchors, seams and mask registration with the generator fixtures. These shells count toward batch 2. |
| 2. Vertical slice | Complete 14 shells total, comprising 6 attached historic, 3 detached, 2 modern, 1 barn, 1 school and 1 inn. Include attached end conditions, pitched and low roofs, reusable doors/windows/shopfronts and compatible trim. Add benches, a stair with landings, lane bends and junctions, park/playground/plaza pieces, orchard/field surfaces, deciduous and conifer pieces, and two mist gaps with a tall split object. | Build a three-band connected composition with a slope, stairs, shop, school and yard/play lot, park, tiny plaza and historic-to-modern frontage. Review dry/wet, mist on/off, and small-display views. |
| 3. Terrain and settlement coverage | Add banks, cliff faces, water and shoreline masks, bridge deck/support/rails, rural gates, farmhouse and outbuildings, far woods, and terrain returns as recipes need them. Add terrain-specific joins and left/right end cases. | Reuse the kit on a valley or gorge, an open contour lane, and a farmstead yard. Check clearance, exits and continuous ground support through connections. |
| 4. Library expansion | Use the handoff's proposed 60-shell target and component counts after slice sign-off. Count distinct structural silhouettes. Expand roof/opening/material combinations, prop clusters, vegetation and mist as compatibility and reference coverage require. | Track completed assemblies, tested compatibility and art/texture budgets by family. Measure overdraw and memory before expanding the pack. |

The [Batch 1 calibration](../assets/townscape/batch-01/README.md) records the shared shop frontage. The [Batch 2 vertical slice](../assets/townscape/batch-02/README.md) provides the 14-shell inventory and the three-band hillside review at both display sizes.

The earlier [asset guide](asset-generation-guide.md) remains a reference for window animation, foliage and existing type/profile IDs. Use the handoff's modular shell counts as the production budget. Existing placeable designs can remain catalog entries. Review the [building integration](building-asset-integration.md) and the [environment](../assets/environment/README.md) and [surface](../assets/surfaces/README.md) pilots for reusable art and import conventions.

## Authoring and compositing

- Terrain pieces provide paint for generator-owned support geometry. Supply land fills with overscan, edges and returns, separate grass/soil/rock treatments, shore and water masks and join anchors. Road pieces include edge/coverage and wetness data, start/end joins, allowed slopes and compatible junctions. Split bridges into supports, rear rails, deck and front rails.
- Give shells independent contact shadow, rear pieces, wall silhouette and clipped pigment, openings, trim, roof/eaves, socketed details and wet/light layers. Inside each window stack, put room backing and clipped motion behind glass, with frame and mullions in front. Link panes in one room with a common room ID. Keep light state and weather layers registered across variants.
- Export plants and lot props with ground or wall pivots, clearances and optional join points. Split tall trunks and canopy where depth requires it. Keep lawns, school yards, play enclosures and plazas assembled from surfaces, boundaries and objects with a clear entrance corridor.
- Supply broad mist sheets, wisps, falloff and noise as separate density data. Declare tile axes, feathering and range. Provide enough transparent overscan for drift. Review mist behind nearer silhouettes and around a tall object. Keep rain and shared paper treatment in scene-level passes.

## Deliverables and handoff

1. Deliver editable layered sources, individual straight-alpha sRGB PNG color layers, and registered grayscale data masks. Author at least 2× the agreed near-plane size. Start with 8 px transparent padding at authoring scale and increase it for feathered assets. Include reference IDs and original/CC0 provenance.
2. Follow the [shared contract in the generator plan](townscape-world-generator-plan.md#shared-asset-contract). For each batch include a versioned manifest, completed assembly examples, a contact sheet at display size, and an inventory with compatible and missing combinations. Use the [handoff naming and metadata example](../Town-Soundscape-Handoff-v1/examples/asset-manifest.example.json) as the authoring baseline.
3. Check masks and clips on light and dark backgrounds. Verify trim/anchor math, wall joins, the entrance and its clearance, foreground/depth masks, and subpath-safe asset loading. Preview the composition at 1920 × 1080 and at the current 960 × 540 pilot size. Compare the sparse lane, connected taper and dense infill with their references before requesting sign-off.
