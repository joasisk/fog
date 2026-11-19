# Data model

A town is a network of streets laid out directly in the side view. Each street has frontage divided into lots of varying widths. A **site** groups one or more neighboring lots for a building or an outdoor use. The layout resolves each place to scene coordinates for painting, clicks, and sound.

## Scene coordinates

The town defines a drawing area in scene units. A position has an `x` that increases to the right, a `y` that increases downward, and a `depth` from `0` near the viewer to `1` far away. For a building or tree, the position anchors it at ground level. Painted shapes rise from that anchor. Ground profiles give the hills, streets, and plantings a common terrain to follow.

Draw farther objects first and composite fog between depths. Scale and offset scene coordinates to fit the canvas, and use the inverse transform to map pointer positions back into the scene. That lets different window sizes use the same town layout.

## Town records

Use TypeScript records with IDs for references between entities. A street can meet another street at a shared junction, and a building can find its street through its site and lots.

| Record | Information it holds |
| --- | --- |
| **Town** | Generation seed, scene bounds, terrain profiles, and collections of streets, junctions, lots, sites, buildings, and vegetation. |
| **Junction** | A position shared by the street segments that meet there. |
| **Street** | A role and one or more segments. The street is the unit of road regeneration. |
| **Street segment** | Endpoint junction IDs, points between those endpoints, road width, and frontage sections. Its path supplies the distances used to place lots and move along the road. |
| **Frontage section** | A side of the street, near or far in the side view, an interval along the segment, and a building arrangement. |
| **Lot** | A frontage section reference and start and end distances along its segment. The interval determines the lot's width along the street. |
| **Site** | Ordered neighboring lot IDs, an entrance along the frontage, a setback, and building limits such as height and shared-wall requirements. A park or bus stop stores its use on the site. |
| **Building** | A site reference, façade and roof design, dimensions, and uses by floor or unit. Its design supplies local anchors such as a door, upstairs window, or bell tower. |
| **Use** | A category such as flat, café, school, or park. A use can contribute households or service capacity and supply a sound profile. |
| **Tree** | A ground anchor in scene coordinates, size, and autumn foliage variant. |

Measure frontage distances along the segment path from its starting junction. Give a corner lot a single owning street based on the main entrance of its site. Keep that ownership through the links from lot to section to segment to street.

## Street roles and building arrangements

A street's **role** guides the mix of uses. Start with town center, residential, and outskirts. A town center favors shops and cafés with flats or offices above. Residential streets favor homes with local amenities. Outskirts can have looser settlement and more trees.

Each frontage section has an **arrangement** that governs where façades and gaps fall. Different sections of the same street can have different arrangements.

| Arrangement | Placement |
| --- | --- |
| **Attached** | Adjacent façades meet at shared walls. Old-town runs can vary in width, height, and roof shape. |
| **Terraced** | Rowhouses share walls and use a more regular building line, with recurring doors and roof forms. |
| **Detached** | Buildings sit within their sites, with side gaps for gardens, passages, or trees. |
| **Mixed** | Attached runs alternate with detached buildings and open sites, such as a church set back from neighboring façades. |

Set shared-wall and clearance requirements at the edges of the site. For a shared wall, align the two bordering façades to the same boundary and building line. A detached site reserves room at both sides.

## Variable-width lots and larger sites

Start with one lot for a detached house or rowhouse, two for a church, and three for a school. Treat these as generation defaults. Check the combined frontage, ground slope, setbacks, and entrance access before assigning a design. A school also needs room for features such as a yard.

For example, three adjoining lots on one frontage section could occupy the intervals `40–49`, `49–62`, and `62–73` along the segment. Their widths are 9, 13, and 11 scene units. On a level segment starting at `(200, 310)` and running right, the combined site spans `x = 240–273` before setbacks. It provides 33 units of frontage for one school building and one click target.

Group consecutive lots within the same frontage section. Each lot belongs to at most one site. Reserve larger service sites before choosing the buildings around them.

## Resolved layout

The layout samples the street path and terrain at each site, then places the building within the site's combined frontage and setbacks. It gives the road a surface to draw and click, and gives the building a ground anchor, depth, and silhouette. Resolve sound positions from the same placement and the active uses. A café door can emit street-level chatter while a flat upstairs has its own window position.

Canvas paints from the resolved geometry, and the input handler uses it to find the visible object under the pointer. The sound engine uses the same scene positions to place sources relative to the listener. Passing cars and footsteps can advance along the segment paths.

## Regeneration

| Click | What the model replaces |
| --- | --- |
| **Building** | Replace the building within its existing site, including its uses and emitters. Fit the whole site span and satisfy its shared walls, access, and any required service. |
| **Road** | Redraw the street and lay out its frontage sections, lots, sites, and buildings again. Anchor the road at its shared junctions and use the street role to guide the new mix. Check access to services along the updated network. |
| **Sky** | Generate a town and layout from a fresh seed. |

Resolve and validate the replacement before the fog reveal. Check that lots fit their frontage sections and meet only at shared endpoints, grouped lots are consecutive, buildings fit their sites, and attached façades meet. Apply geometry, click targets, and sound sources together under cover.

- [Procedural generation](procedural-generation.md)
- [Building properties](building-properties.md)
- [User interaction](user-interaction.md)
