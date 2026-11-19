# Surface asset kit

Fog’s rainy-autumn surface kit has five variants each for roads, sidewalks, curbs, and grass. Cracks, potholes, dirt, grime, and puddles each have five separate transparent stamps. The lossless PNGs and their editable Krita-compatible OpenRaster sources are original art for Fog. [Catalog](catalog.json) · [Contact sheet](contact-sheet.webp) · [Layering preview](layering-preview.webp)

## Place the base materials

Repeat road, sidewalk, and grass fills on both axes and clip them to their scene shapes. Use the same texture origin across pieces of one surface. The curb strips repeat horizontally. Place their `joinPointsPx` along the street edge and let the top and face follow the grade together. The join points mark pixel boundaries, so the right endpoint uses the frame width. `sizeUnits` gives a starting scale for the 1280 × 720 logical scene and `framePx` gives the native PNG size.

## Layer the wear

1. Choose the base material for the street or path. Draw the curb at its edge.
2. Place stamps using `pivotPx`, measured from the upper-left of each PNG. Choose compatible surfaces using the catalog, vary the positions and sizes, and keep the stamps clipped to the surface they belong to.
3. Draw cracks, potholes, dirt, grime, then puddles. A pocket pool can sit inside a pothole, while a gutter ribbon follows the road-side edge of a curb. A change to the stamps gives the same paving a different wear pattern.
4. Draw ripple animation over the puddle and clip it in a separate layer with the puddle’s `clipMask`. Apply the same position, scale, and orientation to the puddle and mask. Add the fixed paper grain after compositing the scene. [Weather textures and ripple](../environment/README.md)

The layering preview uses provisional town scenery. Its three lower panels share the same asphalt, concrete sidewalk, curb, grass, and slope. The second and third panels apply different stamps over that base.
