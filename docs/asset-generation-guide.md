# Fog asset generation guide

Create reusable watercolor assets for a fixed, side-on 2D view of a European town on a rainy autumn day. Deliver individual buildings, plants, street props, and window layers. The scene generator places them along streets of varying slopes and widths. Fog, rain, lighting, and activity are animated in the app.

## Visual direction

- Work in a straight-on elevation with level verticals. Compose from an identifiable ground line. Roof shapes, entrances, and tree crowns should read clearly at the size they will appear in the scene.
- Paint with translucent washes, soft pigment edges, and a few defined details at eaves, window frames, and nearer branches. Keep surface grain subtle so separately painted assets sit on the same paper.
- Use cool slate, damp stone, faded plaster, and weathered timber for the town. Let rust red, burnt orange, umber, and muted green carry the autumn color. A warm lit window should be a small accent against the cool daylight.
- Export on transparency. Keep ground, sky, fog, rain, and cast shadows on separate scene layers. Include ground anchors so the app can set assets on slopes and position fog in front of or behind them.

## Buildings

### Five street profiles

Each profile pairs a street role with a typical frontage arrangement. A civic building, alley, or garden can interrupt a run of attached buildings. Use the looks within each profile as material and trim choices so neighboring buildings can share a palette while their silhouettes vary.

| Code | Profile | Frontage and character | Five looks to draw from |
| --- | --- | --- | --- |
| **O** | **Old town** `old-town` | Center. Narrow, mostly attached buildings with varied widths and rooflines. Shops face the pavement with flats or offices above. | Pale plaster, ochre plaster, muted brick, gray stone, plaster with timber trim |
| **C** | **Civic square** `civic-square` | Center. Mixed frontage with larger civic buildings and a few detached landmarks. Entrances face the square. | Pale limestone, cream stucco, brick with stone trim, rough stone, slate and painted timber |
| **T** | **Terraced neighborhood** `terraced` | Residential. Attached rows with a recurring rhythm of doors and bays. Occasional mixed-use corners and breaks in the row. | Red brick, brown brick, white render, roughcast with painted doors, sandstone with slate |
| **G** | **Garden street** `garden` | Residential. Detached and paired houses with setbacks and gaps for gardens and trees. | Limewashed render, buff brick, stone and plaster, muted timber cladding, cream stucco and clay tile |
| **E** | **Village edge** `village-edge` | Outskirts. Loosely spaced buildings with larger gaps, simpler roofs, and planting along the road. | Fieldstone, weathered timber, faded whitewash, dark brick, earthy plaster and tile |

### Twenty building types

Create **five structural variants for each type in each listed profile**. The catalog below has 73 compatible type and profile pairs, for **365 placeable variants**. Start with five base silhouettes per type and adapt them to the supported profiles. Share original art layers where they fit across profiles. Use the profile list to guide placement.

| Building type | Typical lots | Profiles | Features to vary |
| --- | --- | --- | --- |
| Detached house | 1 | G, E | Off-center entry, hipped or gabled roof, porch, side wing |
| Semi-detached pair | 2 | T, G, E | Two front doors and a shared middle wall, with paired or asymmetric bays |
| Terraced house | 1 | O, T | Narrow entrance, bay window, dormer, stepped or level roof |
| Flats or walk-up | 1–2 | O, C, T, G | Shared entrance, stairwell windows, varied bay count and height |
| Shop house with flats | 1–2 | O, C, T | Street shopfront, separate upstairs entry, bay widths and upper roofline |
| Café with flats | 1–2 | O, C, T, G, E | Broad window, recessed entry, retractable awning, upper flats |
| Restaurant with flats or rooms | 1–2 | O, C, T, E | Sheltered entry, dining windows, deeper frontage or side addition |
| Bookshop with flats | 1–2 | O, C, T | Display bays with softened shelf shapes, doorway, upper flats |
| Bakery | 1–2 | O, C, T, G, E | Small display window, side service door, shop canopy or recessed bay |
| Grocer | 1–2 | O, C, T, G, E | Wide doorway, produce alcove, shallow awning, attached or detached form |
| Small office | 1–2 | O, C, T | Regular office windows, clear entrance, varied floors and staircase position |
| Library | 2 | O, C, T, G | Tall reading-room windows, an entrance bay, quiet side volume |
| Church | 2 | O, C, T, G, E | Bell tower placement, roof height, arched windows, porch |
| School | 3 | C, T, G, E | Main entrance, repeating classrooms, one or two wings, space for a yard |
| Town hall | 2 | O, C | Central or offset entrance, civic clock or pediment, formal window rhythm |
| Clinic | 1–2 | O, C, T, G | Sheltered entrance, clear ground-floor access, waiting-room window |
| Guesthouse | 1–2 | O, C, G, E | Inset porch, groups of guest windows, attic rooms, side wing |
| Workshop | 1–2 | O, T, G, E | Large work door, broad or high workroom window, modest yard or shed |
| Market hall | 2–3 | O, C, E | Long roof, repeated openings, taller central bay or end entrance |
| Park pavilion | 1 | C, T, G, E | Open bays, low shelter roof, timber or masonry supports |

For each set of five, change the visible structure. Vary at least two of the roof silhouette, storey or bay count, entrance placement, and side volumes. Use shutters, awnings, trim, and material swaps for additional variations. Check the set as small silhouettes to see whether each design can be told apart.

Lot counts guide selection. Fit the design to the actual frontage and height limits of the combined site. Include narrower and wider designs among the five variants so the generator can fit irregular lots with small scale adjustments. Supply wall-contact information for both edges of the façade. Attached façades should meet at a shared boundary, with simple end-wall layers available for exposed sides. Detached buildings should fit inside their site with clear gaps at both sides. Use a gap or mixed section for a freestanding church, school, or pavilion on a mostly attached street.

Make at least one old-town café and bookshop pair that share a frontage range, ground anchor, and wall-contact positions. Fog can then reveal a different building on the same site with compatible joins to the neighboring façades.

## Trees

Create **15 species × 4 growth stages × 5 shapes per stage**, for **300 tree sets**. For each species, use `v01` through `v05` as distinct individuals and carry a recognizable trunk habit through their growth stages.

| Stage | Shape |
| --- | --- |
| **Sapling** `sapling` | Thin trunk, a few visible branches, small or sparse crown |
| **Young** `young` | Established branching, developing species-specific crown |
| **Mature** `mature` | Full crown and characteristic branch structure |
| **Old** `old` | Heavier trunk, irregular crown, some exposed branches where appropriate |

Vary the lean, branching, crown outline, and density. Use different proportions as the tree develops. Preserve species cues at small sizes.

| Species | Silhouette cue | Autumn foliage range |
| --- | --- | --- |
| English oak | Broad crown broken into heavy, rounded lobes | Olive, russet, deep brown |
| European beech | Smooth trunk and spreading, layered crown | Gold, copper, warm brown |
| Silver birch | Pale slender trunk and a fine, open crown | Yellow, ochre, sparse olive |
| Norway maple | Wide, rounded crown with substantial leaf clumps | Yellow, burnt orange, occasional rusty red |
| Horse chestnut | Low dome with large drooping clumps | Gold, russet, brown |
| European hornbeam | Dense oval crown with fine branches | Yellow, amber, tan |
| Small-leaved lime | Tall rounded crown and upright branching | Muted yellow and green |
| Rowan | Light crown with open clusters and bright berry accents | Orange, red, bronze |
| Wild cherry | Upright trunk with an airy, spreading crown | Orange, red, crimson |
| European ash | Open crown with visible forks | Olive, pale yellow, early leaf drop |
| Black alder | Narrower crown and dark trunk near damp ground | Muted green, ochre, brown |
| White willow | Broad, loose crown with long, fine hanging sprays | Silvery green and yellow |
| European larch | Loose conical crown with fine needle sprays | Yellow and amber |
| Scots pine | Rusty upper trunk and irregular, high umbrella crown | Deep or muted green |
| Norway spruce | Tall pointed crown with layered, drooping boughs | Dark and blue-green |

**Export recolorable foliage as a separate grayscale value layer with alpha.** Keep branches, trunks, and optional berries in separately colored layers with the same ground anchor and crop. Use the value layer to tint highlights, midtones, and shadows while preserving transparency and painted texture. Check one shape in several plausible colors, including rust red, burnt orange, brown, and green across the set. Keep the pines and spruces in evergreen tones. Use optional sparse foliage masks or separable clumps for some trees that have already dropped leaves.

## Bushes, flowers, and street details

Start with three shapes per family. Use low-profile silhouettes and leave room for fog to pass through the street between plantings.

| Set | Families | Count |
| --- | --- | --- |
| **Shrubs** | Hawthorn, hazel, dog rose, elder, privet, yew, holly, hydrangea. Include berries or dried heads where appropriate. | 24 |
| **Flower and seedhead clumps** | Aster, chrysanthemum, autumn cyclamen, heather, stonecrop, dried seedheads. Keep them in small patches, planters, or garden beds. | 18 |
| **Ground cover** | Grass tufts, reeds, ferns, ivy. Provide ground or wall anchors as appropriate. | 12 |
| **Street and garden props** | Stone walls, wooden fences, planters, lamps, benches, bollards, rain barrels, leaf piles, stone steps, puddles. Give walls and fences pieces that can meet cleanly. | 30 |

Use the shrub and ground-cover layers to soften hillsides, garden edges, and the gaps between buildings. Place flowers sparingly so the autumn canopies carry the strongest color.

## Animated windows

Draw each building as a painted shell with openings for animated panes. Supply a separate pane mask for each window, with a room ID so multiple windows can share one light state. Use six reusable window families to start.

- Narrow sash
- Paired casement
- Wide shopfront
- Small attic or dormer
- Arched civic or church pane
- Tall hall or stairwell pane

Paint the glass in cool gray for unlit rooms and a soft, low-contrast warm wash for lit rooms. Deliver the window layers in this back-to-front order.

1. Interior backing with cool unlit and warm lit treatments.
2. Masked silhouettes, curtains, or blinds inside the room.
3. Optional glass wash or soft reflection.
4. Painted frame, mullions, sill, and surrounding façade.

Provide reusable, low-detail silhouettes for a person walking past, pausing, and sitting or rising. Supply a simple moving curtain and a blind that can partly close. Deliver the moving shapes and opacity masks separately so the renderer can slide, fade, and clip them within the panes. Keep interior forms indistinct, especially through stained glass and small windows.

Lights ease on and off over a couple of seconds. Give rooms irregular timing and leave long stretches of stillness. A café may show a brief crossing shape behind its glass, while a flat upstairs lights up once and stays warm for a while. Windows in one room brighten together, and a moving silhouette can continue from one pane to another behind the frame. Keep most windows quiet in rainy daylight.

## Asset handoff

Export lossless transparent PNGs for the prototype and keep the editable layered sources. Use the ground contact as the placement anchor. Measure its pixel coordinates from the upper-left of the frame. Align all layers to that frame, or record a cropped layer's rectangle as `[x, y, width, height]`. The app maps the anchor and layers into the side-view scene together.

| Asset | Include with the images |
| --- | --- |
| **Building** | Stable ID such as `buildings/cafe/old-town/v01`, type, profile, variant, typical lot count, reference size and supported frontage range in scene units, frame size, ground anchor and span, supported wall contacts, floor uses, and entrance and sound anchors. |
| **Window** | Window and room IDs, associated floor use, family, pane rectangle relative to the building frame, mask path, and layer paths. Use the mask to limit light and motion to the glass. |
| **Tree** | Stable ID such as `trees/beech/mature/v03`, species, growth stage, variant, reference height and crown spread in scene units, frame and ground anchor, trunk and foliage layers, and compatible palette names. |
| **Other plant or prop** | ID, family, variant, frame and ground or wall anchor, and any tint mask or join points. |

For example, the placement fields for a café and one of its window openings might look like this.

```json
{
  "id": "buildings/cafe/old-town/v01",
  "framePx": [384, 480],
  "groundAnchorPx": [192, 460],
  "groundSpanXPx": [24, 360],
  "frontageRangeUnits": [10, 14],
  "wallContacts": ["left", "right"],
  "shell": "shell.png",
  "windows": [
    {
      "id": "shop-window",
      "roomId": "ground-cafe",
      "use": "cafe",
      "family": "wide-shopfront",
      "rectPx": [35, 344, 130, 58],
      "mask": "windows/shop-window-mask.png"
    }
  ]
}
```

Record the source and license of any reused material. Use original or CC0 assets for the distributable pack.

## Production order and checks

1. **Make the pilot.** Produce the café and matching bookshop, one attached neighbor, one detached house, a beech and a spruce, and a small set of street plants. Include a storefront with movement and an upstairs room with a light shared across two panes.
2. **Check a short street composition.** Line up the attached façades on a common baseline and set a detached building back from its neighbors. Check their scale against the trees at the intended display size. Place the café next to the bookshop in a comparison sheet and check that either fits the shared site.
3. **Check layers.** Place each export over light and dark washes to inspect its edges. Recolor the same beech foliage while keeping its trunk color. Preview each growth stage at its intended size. Fade a room's lights and move a silhouette behind the glass. Check that the mask holds at the edge of each pane and that the frame stays in front.
4. **Expand in sets.** Submit buildings in type and profile sets of five and trees in species sets of four stages by five shapes. Include a contact sheet, individual layers, and metadata for each set. Add material, foliage, and trim options once the shapes read clearly together.

### Example request to an asset agent

> Use this guide to produce one pilot set for Fog. Start with an attached old-town café with flats over it and a bookshop that fits the same site. Show the two façades side by side with matching ground and wall contacts. Export their transparent shells, separate window masks and room layers, and placement metadata. Include an unlit and lit preview and one silhouette crossing a shop window. Add the attached neighbor, detached house, beech, spruce, and street plants for previews at game scale.

- [Visual styling](visual-styling.md)
- [Data model](data-model.md)
- [Technology](technology.md)
