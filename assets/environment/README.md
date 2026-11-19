# Environmental asset pilot

The first weather set for Fog contains 11 original textures. Each straight-alpha PNG has an editable, same-size OpenRaster file under `source/` that opens in Krita. [Asset catalog](catalog.json) · [Contact sheet](contact-sheet.webp) · [Animated preview](weather-preview.mp4)

## Compositing the weather

| Asset | Placement and movement |
| --- | --- |
| Overcast sky and stratus wash | Lay the sky wash over a warm paper base. Place the cloud wash high in the view behind the hills and drift it slowly. |
| Distance veil | Draw in front of the furthest roofs and slopes. Keep enough of their pale silhouettes visible to read the hillside. |
| Street bank | Draw in front of the façades and behind a nearer tree or curb. Set its height from the local street profile so it can gather in hollows and veil doorways. |
| Ground wisp | Keep it low across the foreground. Let it sweep past the foot of a trunk while its branches remain clear. |
| Cover bank | Put its opaque center over the union of the old and new painted bounds during replacement. Ease the feathered bank in and roll it out after the swap. |
| Fine and near rain | Align each streak with the rain velocity. Use the shorter stroke for most drops and scatter the longer one sparingly. |
| Eave drip and puddle ripple | Start a drip at an eave. Expand each ripple from its center, fade it as it expands, and clip it to the puddle outline. |
| Paper grain | Tile it at a fixed origin above the scene. Keep the origin steady while the weather moves. |

The catalog uses the `framePx` and `image.url` conventions from the scene model. `pivotPx` is relative to the upper-left of the PNG. `sizeUnits`, drift, and opacity give starting values for a 1280 × 720 logical scene. The fog depth values use the scene model’s range from 0 near the viewer to 1 in the distance.

During a reveal, scale and place the bank so its `opaqueRectPx` contains the union of both painted bounds. Allow a margin for eaves, chimneys, and texture filtering, and use full opacity during the replacement. The animated preview demonstrates this on a café-to-bookshop change with provisional street art. It shows the taller roofline appearing as the fog clears, with the rain and foreground tree visible through the transition.

[Visual styling](../../docs/visual-styling.md) · [Asset generation guide](../../docs/asset-generation-guide.md)
