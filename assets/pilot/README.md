# Fog pilot assets

The first production batch uses the approved flowing watercolor washes. It includes four building shells, two mature trees, three street plants, three props, eight decorations, six reusable window families, and five room activity pieces.

## Placement

`manifest.json` is the entry point. All paths are relative to this directory. Pixel coordinates start at the upper left of each frame. Place a building by its ground anchor and scale it from its ground span. The café and bookshop share a frame, anchor, wall contacts, and frontage range of 10–14 scene units. The terrace and shops include optional end-wall strips for exposed joints. The wall and fence have join points. Floor uses, doors, sound anchors, and decoration mounts use the same building coordinates.

## Painting order

1. Draw the cool window backing. Blend its warm backing using the room's light amount.
2. Draw a person, blind, or curtain through the pane mask. Add the glass wash.
3. Draw the façade shell over the backing. Color the plaster through its grayscale value layer and mask.
4. Place awnings, signs, shutters, and the other independent decorations at their mounts.

Use the same light amount for every window with a matching room ID on a building. Crop positions for window layers are in `rectPx`. The building shell carries the window frames and mullions. Cool and warm backing PNGs share their crop.

Draw the tree trunk and branch layer below its foliage. The original foliage PNG carries the approved colors. The grayscale foliage value PNG supports the compatible palettes listed in the manifest. Draw fog between scene depths as a separate layer.

## Review and source files

The `review` directory has a contact sheet, a distant three-street view, a frontage comparison, and the window and foliage studies. Serve the pilot folder over HTTP and open `review/index.html` to try the fog, façade, decoration, light, and activity controls.

OpenRaster files under `sources` hold the editable layers and open in Krita. The PNGs are lossless exports. Original generative art was prepared for Fog, including the approved cottage and beech used in this batch.
