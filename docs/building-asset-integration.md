# Assemble buildings from the asset pack

Fog places a catalog design on a resolved site, then paints the design's layers in the same coordinate system used for entrances, hit testing, and sound. Each design supplies an elevation whose roof, walls, openings, and trim have already been fitted together. Code selects that elevation, fits it to the lot, and varies its appearance using the façade color, mounted decorations, and room state. [Building catalog](../assets/building-catalog/README.md) · [Data model](data-model.md)

## Load the catalog

Use `assets/building-catalog/` as the asset root. Load `catalog.json` first. Its `buildings` array indexes the 365 variants by ID, type, street profile, and frontage. Each entry's `design` path leads to the full `design.json` for that elevation. Resolve every path, including the paths inside a design, from the **catalog root**. [Catalog index](../assets/building-catalog/catalog.json)

| Record | Use |
| --- | --- |
| Catalog entry | Find candidates by type, profile, width, and wall contacts. Load full design records for shortlisted candidates and decode artwork for the selected buildings. |
| `design.json` | Get placement, the ordered exterior layers, room and window data, floor uses, and entrance, sound, and decoration anchors. |
| `components/manifest.json` | Look up shared parts by role. Use the selected design's `componentLayers` for its assembled exterior and its `decorationMounts` for optional additions. Some approved pilot designs have an empty `componentInstances` list and a full layer stack. |
| `preview.png`, `sets/`, `source.ora` | Use the unlit composites and contact sheets for review and the layered OpenRaster sources for editing. |

Validate `schemaVersion`, design IDs, frame and crop dimensions, and the references from windows to rooms and floor uses as records load. Use the existing `BuildingDesign` and `ImageLayer` shapes for shared fields. Keep the additional catalog fields, such as `componentLayers`, `rooms`, and `facadeValue`, on the catalog record used by placement and painting. `Building.designId` connects an instance to that record. [Building design types](../src/model/building-designs.ts) · [Image layer type](../src/model/assets.ts) · [Building instance](../src/model/places.ts)

For Vite, stage the runtime JSON and PNGs under `public/assets/building-catalog/` or an equivalent generated public directory. Preserve their relative paths during development and build. Resolve URLs from Vite's base so the same files load from a site root or a path such as `/fog/`. [Vite configuration](../vite.config.ts) · [Existing audio asset URLs](../src/pilot/audio-assets.ts)

```ts
const appBase = new URL(import.meta.env.BASE_URL, document.baseURI);
const catalogRoot = new URL("assets/building-catalog/", appBase);
const assetUrl = (path: string) => new URL(path, catalogRoot);

// Fetch assetUrl("catalog.json"), then assetUrl(entry.design).
// Use assetUrl(design.shell) and the same resolver for all layer paths.
```

## Select a design that fits the site

1. Resolve the site, the number of consecutive lots it occupies, and the owning frontage section's street profile. Filter entries by the permitted building type and profile.
2. Check the full design's `lotCountRange`, the usable width against `frontageRangeUnits`, and the scaled height against the site's envelope. For a resolved width `w`, painted height is `referenceSizeUnits[1] * w / referenceSizeUnits[0]`. Treat `typicalLotCount` as a selection preference.
3. Match each shared edge to a supported `wallContacts` side. Use `wallContactXPx` for the join coordinate and `endWalls` for exposed ends. Map the site's start and end edges to the sprite's left and right using the frontage direction. For detached designs, reserve the specified `sideClearanceUnits` and fit the building line using `setbackRangeUnits`.
4. Choose among the fitting candidates with the seeded generator. Give candidate IDs a stable order before drawing from the seed. Keep browser loading and timing outside this choice so the same seed and data reproduce the same layout.

Use a consistent unit scale before comparing catalog widths and heights with site dimensions. The two-street prototype uses provisional widths of 203–233 and a height limit of 222 for its shop. At a resolved width of 203, the catalog café would paint about 319 units tall. Lay out the shop parcel for the painted proportions and the intended distant view when integrating the catalog. [Pilot site dimensions](../src/pilot/scene.ts) · [Café design](../assets/building-catalog/buildings/cafe/old-town/v01/design.json)

## Place the frame and its anchors

`groundSpanXPx` gives the painted frontage. `groundAnchorPx` gives the origin of the resolved building position. The full `framePx` includes transparent margins. Use one scale for both axes and apply the scene-to-screen transform after placement. The example takes the resolved left edge and ground line in the same scene units as the target frontage.

```ts
type SpriteGeometry = {
  readonly framePx: readonly [number, number];
  readonly groundSpanXPx: readonly [number, number];
  readonly groundAnchorPx: readonly [number, number];
};

function placeElevation(
  design: SpriteGeometry,
  left: number,
  groundY: number,
  frontage: number,
) {
  const [lo, hi] = design.groundSpanXPx;
  const [ax, ay] = design.groundAnchorPx;
  const scale = frontage / (hi - lo);
  const origin = { x: left - lo * scale, y: groundY - ay * scale };
  const point = (x: number, y: number) => ({
    x: origin.x + x * scale,
    y: origin.y + y * scale,
  });
  return { scale, origin, anchor: point(ax, ay), point };
}
```

For example, place `buildings/cafe/old-town/v01` on a 12-unit frontage from x 100 to x 112, at ground y 220. Its span is `[24, 624]` and anchor is `[324, 1024]`. The scale is 0.02 scene units per pixel, the frame origin is `(99.52, 199.52)`, and the ground anchor is `(106, 220)`. `buildings/bookshop/old-town/v01` has the same frame, anchor, wall contacts, and 10–14 unit frontage range. The same transform places either design on this site. [Café design](../assets/building-catalog/buildings/cafe/old-town/v01/design.json) · [Bookshop design](../assets/building-catalog/buildings/bookshop/old-town/v01/design.json)

Use the same transform for `entrances[].positionPx`, `soundAnchors[].positionPx`, and the click silhouette. Resolve the chosen street entrance to its frontage connection. Map each asset-local `floorUseId` to the corresponding instance's `BuildingUse.id` when creating emitters. Prepare a contour or bounds for hit testing and fog coverage from the actual placed elevation. A generator can consume that outline as plain data prepared from the exterior art and its glazing. Give each resolved instance the site's depth. [Building and site types](../src/model/places.ts) · [Sound emitter types](../src/model/sound.ts)

## Paint the layers in building coordinates

Compose into a transparent buffer of `framePx` and stamp it into the scene using the transform above. Each layer's `rectPx` is the **destination** rectangle in the building frame. For a cropped PNG use `ctx.drawImage(image, x, y, width, height)`. For a full-frame PNG draw at `(0, 0)`.

1. **Exposed ends.** Draw the applicable `endWalls.left` or `endWalls.right` from its rectangle behind the exterior where the joint is exposed. At a stepped roofline, limit the cap to the visible part of the joint.
2. **Window backing and light.** For each opening draw `unlitInterior`. Blend in `litInterior` using an opacity from 0 to 1. Key the light and timing by building instance and `roomId`. Windows in the same room share that amount. The café's two windows in `flats-1-living` are a test case.
3. **Room activity and glass.** Draw a supported `activityLayers` sprite into a cleared scratch buffer aligned to `maskRectPx` or `rectPx`. Apply the pane mask with Canvas 2D `destination-in` in that scratch buffer, then draw it at its rectangle over the backing. Advance a moving person in shared room coordinates so the same movement can cross adjacent panes. Draw the recorded glass wash over the activity.
4. **Exterior and façade tint.** Draw `shell` for the preassembled exterior, or draw `componentLayers` in the order listed for independent walls, roofs, doors, trim, and frames. Each path includes the painted window frames. Use `window.frame` for an isolated window view. For a color override, compose the exterior on its own buffer. Add the local value delta `facadeValue.R - facadeMidtone` to the selected RGB, clamp the result, and blend it into the exterior through the mask alpha. `facadeValue` already carries the coverage of `facadeMask`, which limits the blend to the visible wall paint.
5. **Decorations.** Draw selected `decorationMounts` using each `image` and `rectPx` over the exterior. The rectangle already accounts for its mount anchor. When `mirror` is true, flip the image within that same rectangle. Use `default` for starting choices and the mount data for swaps. Draw ground-mounted items in the appropriate scene depth when they must overlap other objects.

The café's `shop-window` crop is `[73, 778, 288, 170]` in building pixels. Its cool backing, warm backing, glass wash, and pane mask share that crop. The viewer exercises these layers and shows façades with their parts toggled. [Shop window record](../assets/building-catalog/buildings/cafe/old-town/v01/design.json) · [Catalog viewer compositor](../assets/building-catalog/review/review.js)

Keep rain and fog in the scene renderer. Draw buildings in resolved depth order with fog between the appropriate depths. Project the whole town through the viewport so the same building art can appear on several streets at once. [Visual styling](visual-styling.md)

## Connect the prototype

| Entry point | Integration |
| --- | --- |
| `src/pilot/scene.ts` and `src/pilot/residential.ts` | Feed the generator validated catalog data. Choose and fit a design and resolve the geometry, uses, entrances, and emitters in the corresponding `Scene` snapshot. |
| `src/pilot/render.ts` | Replace the provisional building paint step with a lookup by `Building.designId` and a draw at the resolved transform. Cache exterior art by design, paint, and mounted choices. Draw changing room buffers during animation, outside the static scenery cache. |
| `src/pilot/regenerate.ts` and `src/pilot/main.ts` | Fit the replacement on the existing site and include both the outgoing and incoming outlines in the fog cover bounds. Join artwork decode to the pending replacement's readiness check. Commit the visible building, click geometry, uses, and audio together once cover and readiness are satisfied. Keep the current scene available if a replacement fails to load. |

The pilot prefers the approved café, bookshop, terrace, and cottage elevations when they fit. Market Lane projects one catalog unit as ten scene units and Garden Lane as nine. The attached buildings share the Market Lane building line, while the cottage has side gaps and a setback from Garden Lane. Vite serves the catalog from the source tree during development and copies its runtime files into `dist/assets/building-catalog/` for production. During a swap, the fog reveals the previous scene if the replacement artwork fails to decode. [Scene creation and shop swap](../src/pilot/scene.ts) · [Renderer](../src/pilot/render.ts) · [Regeneration](../src/pilot/regenerate.ts) · [Transition and pointer flow](../src/pilot/main.ts)

## Check the first integration

- Load the catalog, a design, and its image layers from both the site root and a subpath.
- Fit the café and bookshop to one compatible site and compare their baselines and shared-wall coordinates. Check the footprint and painted height against the site limits. Place a detached cottage with its setback and side gaps.
- Turn on the two café flat windows together and move a person behind the shopfront mullion. Recolor the façade and toggle a decoration with the same geometry and room lighting.
- Swap the shop under fog. Verify that its hit target and sound follow the new shop and that a failed image load leaves the current shop visible. Check the result at the intended distant viewing scale.

To inspect the assets directly, run `python3 -m http.server 8000` from the repository root and open `/assets/building-catalog/review/`. The viewer can switch exterior components, tint the façade, and animate the room layers. [Catalog viewer](../assets/building-catalog/review/index.html) · [Development plan](development-plan.md)
