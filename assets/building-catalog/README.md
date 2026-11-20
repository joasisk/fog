# Fog building catalog

The guide's full building catalog includes **365 variants**, covering 20 types and five street profiles. Each of its 73 type and profile sets contains five structural designs. One hundred base plans use shared original watercolor materials and joinery. The four approved pilot buildings occupy their original variant IDs.

For loading, site placement, and the Canvas 2D layer order, see the [building asset integration guide](../../docs/building-asset-integration.md).

## Load a building

Open `catalog.json` to find a compatible type, profile, and variant. Each entry points to a `design.json`. Paths in every record are relative to this catalog directory. Scene units describe reference dimensions and supported frontage. Pixel coordinates start at the upper-left corner of the full frame.

Scale from `groundSpanXPx` and place the sprite by `groundAnchorPx`. Attached buildings supply the wall boundaries and separate end walls for exposed joints. Detached buildings supply setback and side-clearance ranges. Floor uses, room IDs, entries, sound positions, and decoration mounts share the same frame.

## Assemble the layers

1. Draw each window's cool backing and blend in its warm backing using the room's light amount. Apply the same amount to windows with the same room ID.
2. Clip people, curtains, and blinds through each pane mask. Draw the glass wash over the room.
3. Draw `shell.png`, or assemble the ordered `componentLayers` at their recorded rectangles. These layers separate façade and bay walls, roofs, plinths, trim, chimney and dormer art, doors, and window frames where the design uses them.
4. Recolor the visible wall material through `facadeMask` and `facadeValue`. The value image preserves the painted light and shade. Place the awnings, signs, shutters, and other decoration layers at their recorded mounts.

The scene renderer places ground, rain, and fog on scene layers. The unlit composite is available in each variant's `preview.png`.

## Review and edit

- `sets/` contains a contact sheet for each type and profile. Each sheet shows the five variants over light and dark washes, including a game-scale row.
- `review/index.html` is a local catalog viewer. Serve this folder over HTTP to browse the variants and inspect exterior layers, façade colors, and room activity.
- `source.ora` beside each design contains editable painted parts. Room states and masks are available as layers. OpenRaster sources under `sources/components/` carry the shared artwork. The base plans are in `sources/structural-plans.json`.

The paintings and structural plans were created for Fog. Windows, decorations, and activity artwork from Fog's pilot pack are reused here.
