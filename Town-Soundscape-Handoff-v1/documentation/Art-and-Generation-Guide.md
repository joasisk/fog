# Rain on the town
## Asset design and procedural generation
Version 1.0 - 21 November 2026

## How to use this handoff

A shared visual contract for the asset designer and the developer building the procedural scene.

### Start with the right reference

Use REF-S01-S10 for small settlement framing and countryside, REF-U01-U05 for large-town extent and mixed-age architecture, REF-T01-T05 for a real density taper, and REF-L01-L10 for terrain-driven placement. Each ID matches an image filename and a plate in this PDF.

### What is established

The look is a small-scale European watercolor panorama in soft autumn rain. Front-facing buildings overlap several connected streets in compressed forced perspective. Lanes stay narrow. Parks, playgrounds and plazas occupy lots among buildings. Settlement size changes through footprint and building count.

### What is proposed here

The module dimensions, asset quantities, probabilities, slope limits, file contracts and mist settings are production starting points introduced for this handoff. Validate them in a vertical slice before commissioning the whole library. No renderer or engine is prescribed.

### Reading route

- Designer: visual contract, architecture, budgets, material stacks, decoration rules, exports, then the relevant reference plates.
- Developer: scale, density, terrain, street graph, placement, draw order, mist, data contracts and validation.
- Together: approve a small vertical slice, then expand the asset library using the agreed rules.

### What the pictures are

The 50 PNGs are flattened concept images, supplied at their original resolution. Thirty are current references; twenty historical iterations are retained separately. They are not ready-to-use terrain strips, isolated sprites, masks or texture atlases. Those production assets must be authored as separate layers.

### Mist extension

Rolling mist between depth layers is a proposed addition. The studies show painted atmosphere but do not demonstrate the moving, interleaved mist system described later in this guide.

## The visual contract

Keep the town readable as a place while preserving soft, imperfect watercolor marks.

### Shape and composition

- Favor mostly frontal facades, slightly visible roofs and shallow side planes. Ground changes height; the camera stays predominantly side-on.
- Build a hierarchy of small ordinary buildings, a few civic landmarks and quiet open lots. Reserve large uninterrupted spaces for countryside and water.
- Vary eaves, setbacks, plot widths and tree crowns. Connect the composition through lanes, walls and vegetation.
- Use near objects to hide parts of farther streets. Keep important entrances and public places visible through selected openings.

### Paint and edges

Use translucent pigment, softened joins, restrained dark accents and local granulation. Architectural edges can be precise at doors and windows while foliage, distant roofs and wet ground dissolve. Keep paper texture aligned with the final image rather than independently scrolling on every sprite.

### Palette and light

Start with warm plaster, muted stone, slate gray, terracotta, weathered timber, ochre and rust leaves. Rain and sky are cool gray. Window light is subdued amber. Avoid making every window glow equally or every garden flower-rich.

### Coherent variation

Choose material and architectural families at district level. Neighboring houses share a plausible regional language, while silhouette and detail vary. Modern buildings use the same brush treatment, light and palette as historic ones.

### Reference priority

REF-T01-T05 override earlier density experiments when judging taper. REF-L01-L10 override the earlier nearly level layouts when judging terrain. REF-U02 is retained as a dense town with garden districts; it is not a successful taper reference.

### Deliberate omissions

The study does not define a real country, historical period, simulation of structural engineering, or a live sound engine. Maintain architectural plausibility without requiring one regional replica.

## Scale, camera and depth

Use one viewing scale across settlement sizes. A larger town earns its extent through more lots and streets.

| Control | Proposed starting convention | Validation |
| --- | --- | --- |
| Reference viewport | 1920 x 1080 virtual pixels; all compositions remain 16:9. | Review at this size and at the smallest supported display. |
| Frontage unit F | F = 72 virtual pixels at the near reference plane. | Ordinary two-storey houses are usually about 0.65-1.35 F wide and 1.0-1.6 F high, including roof. |
| Depth scales | Begin with 1.00, 0.88, 0.76, 0.64, 0.53, 0.43. Add farther bands only when needed. | Apply one coherent scale per band, with small local variation. Do not independently scale facade parts. |
| Street reveal | Usually 0.04-0.12 F apparent paved depth at the near plane. | This is screen reveal, not real lane width. Buildings and gardens obscure much of it. |
| Camera behavior | Fixed framing for comparing town recipes. Optional shallow parallax follows logical depth. | Do not zoom toward the nearest facades to make a large town fill the frame. |
| Grounding | A building root is its ground contact. Ground elevation and depth determine its projection. | Keep walls vertical and floors level; terrain is absorbed by foundations or terraces. |
| Landmark allowance | A church, school or civic hall may exceed ordinary-house height. | Use sparingly. Avoid a giant landmark that changes the perceived scale of the whole scene. |

These are starting measurements, not measurements extracted from the generated images. Match the perceived scale of the current references in the first implemented scene.

## Settlement recipes and coverage

Separate the amount of inhabited land from the density within it. This allows sprawl, taper and isolated settlements to coexist.

| Recipe | Built pattern | Open space and reference family |
| --- | --- | --- |
| Large town | Many small blocks across most of the frame and several depth bands. | Parks and courtyards are local interruptions; use REF-U01-U05. |
| Transition town | A connected dense edge or center loses attachment and lot occupancy along one or more directions. | Garden lots become orchards, then fields. The decrease must appear in far bands too; use REF-T01-T05. |
| Isolated old town | A finite, close-built core with a strong edge to its surrounding landscape. | An intentional compact island within meadow or woodland; use REF-S01-S04. |
| Garden town or village | Small groups, detached houses and productive plots share the street. | Garden and agricultural lots occupy much of the settled area; use REF-S05-S08. |
| Hamlet | A few homes and service buildings form a modest gathering place. | Most of the image is landscape; use REF-S10 and smaller L studies. |
| Farm lane | Very few buildings follow one narrow connected route. | Fields, woodland and terrain dominate; use REF-S09 and REF-L10. |

Do not hard-code the number of houses from a concept image. Let the viewport, lot sizes, terrain exclusions and recipe jointly determine the count. Preserve the relative progression from large town to farm lane.

## Recipe parameter starting points

These ranges are suggested prototype controls, not counts measured from the concept images or fixed production requirements.

| Recipe | Visible buildings / bands | Distribution at the fixed camera |
| --- | --- | --- |
| Large town | 160-320 / 6-10 | Inhabited ground reaches both sides and the near frame edge. Core placement score around 0.75-0.90; outer districts can remain well built. |
| Transition town | 50-150 / 4-7 | A connected occupied edge or center loosens across 65-95% of the view. Placement score falls from about 0.85 toward 0.05-0.15. |
| Small old town | 35-85 / 3-5 | A finite, close-built settlement occupies around 35-60% of view width, surrounded by landscape. |
| Village | 18-40 / 2-4 | Looser groups, productive plots and a modest center across around 25-50% of view width. |
| Hamlet | 7-18 / 2-3 | Few buildings form one small public focus. Landscape dominates; settlement occupies around 15-35% of width. |
| Farm lane | 5-10 / 1-2 | A thin inhabited ribbon can span 20-50% of width while occupying little image area. |

Counts include visible inhabited buildings and outbuildings, not every far roof suggestion. A band's extent is a logical planning choice; bands need not be visible as full rows. Terrain, lot-size distributions and civic reservations can reduce the achieved count. Judge the final result against the relevant reference family before tuning exact numbers.

## How a town should taper

A gradient changes attachment, occupancy and lot use together. It does not simply shrink a dense town into an empty clearing.

See the schematic in the PDF, page 8.

### Three coupled changes

- Core: attached narrow facades and little private land. Reserve one small public square.
- Middle: short rows and pairs, increasing garden widths, occasional civic or modern infill.
- Edge: detached houses, productive plots and fewer branches, then a last house and open land.

### Keep the route continuous

The street graph must still connect the core, outer homes and exits. Let planted lots occupy the gaps. Preserve a few views through those gaps so the connected taper reads clearly.

### A starting field

Use t from core to edge. D(t) = D_edge + (D_core - D_edge) * (1 - smoothstep(a,b,t)). Begin near D_core = 0.85 and D_edge = 0.08. Treat D as a placement score rather than a literal promised percentage of occupied image pixels.

### Apply it in depth

Evaluate the same world-space field for every street band. Use low-frequency variation to avoid a ruler-straight edge, but cap it so noise cannot repopulate the intended countryside. Lower attachment probability and street branching as D falls.

## Terrain is an input to the town

Different landforms should produce different street graphs, ground contacts and areas that remain unbuilt.

| Reference | Terrain signature | Placement response |
| --- | --- | --- |
| REF-L01 | V-shaped river valley | Contour streets on both banks; bridge nodes at explicit crossings. |
| REF-L02 | Steep coastal headland | Harbor at the foot, stairs uphill, rock and water exclusions. |
| REF-L03 | Unequal benches above a lake | Build on usable shelves; expose scarps and connect levels with steps. |
| REF-L04 | Saddle between two shoulders | Streets descend into the dip and climb out; reveal the gap behind it. |
| REF-L05 | Continuous steep slope | Short cut terraces, stair lanes and stepped foundations. |
| REF-L06 | Deep gorge with two rims | Two neighborhoods joined by a bridge with separate deck and supports. |
| REF-L07 | Rounded knoll | Routes and plots wrap the convex rise; fields drop away at its edges. |
| REF-L08 | Concave forest bowl | A low clearing and homes on the lower rim; woodland encloses the scene. |
| REF-L09 | Raised wetland bank | Narrow buildable spine with wet ground below; raised approaches. |
| REF-L10 | Mountain contour ledge | A few buildings on one shelf; steep exclusion below and forest above. |

Maintain a height field or a set of consistent terrain profiles in world units. Decorative mountains behind a level settlement do not satisfy these terrain recipes.

## The generation sequence

Resolve large spatial decisions before adding visual detail. Keep independent, stable random streams for each stage.

### 1. Land and settlement

- Choose recipe, seed, architectural region and weather state.
- Generate terrain height, depth bands, water, cliffs, woodland and buildability masks.
- Place the center and evaluate density, district and land-use fields across the whole visible world.
- Construct the street graph, crossings, stairs and exits. Check that key destinations are connected.

### 2. Lots and massing

- Parcel usable frontage along each graph edge.
- Reserve civic, plaza, park and playground lots before housing fills the rest.
- Select a compatible shell, footprint and style for each building lot.
- Solve elevation, foundations, access and overlaps. Validate the silhouette at thumbnail scale.

### 3. Appearance and weather

- Choose wall and roof materials, openings and storefront templates.
- Populate attachment sockets and ground decoration with constrained variation.
- Build draw packets, split objects at necessary occlusion boundaries, and generate masks.
- Insert mist between selected depth packets, then apply rain, wet highlights and final color treatment.

### Stable results

Derive sub-seeds from scene seed + stage + stable lot or object ID. Changing mist, one flower pot or one material should not regenerate the street network. Retain a scene recipe and the resolved scene data so a specific result can be reproduced.

### Repair locally

If a lot fails, try a compatible smaller footprint, a foundation change, or a non-building lot before modifying the graph. Record a bounded number of retries. A failed ornament should never relocate the whole town.

## Constructing a terrain-aware street graph

A practical starting algorithm fits a sparse connected skeleton to the land, then parcels its usable frontage.

### Build the skeleton

- Place the center on a buildable patch near the intended density peak. Create the main route toward one or two frame exits.
- Sample candidate paths on terrain. Penalize steep gradients, water, cliffs and protected public lots. Favor shallow contour paths within each band.
- Add a small number of cross-depth links, with explicit stairs or bridges where needed.
- Start junction spacing around 3-6 frontage units in a core, 6-10 in garden streets and 10-20 along rural lanes, then tune visually.

### Keep crossings meaningful

A line crossing in the projected image is not automatically a junction. Store connection level and route type. A bridge deck and the river path below have different graph edges and different occlusion packets.

### Allocate frontage

Walk along each usable route edge in stable order. Sample a lot width from compatible building families, reserve access and rear depth, and test buildability. Choose attached, paired or detached occupancy using district and density fields. Place non-building lots in the remaining frontage deliberately.

### Candidate rejection

Reject self-intersecting routes, footprints over exclusions and lots with no entrance connection. Limit local retries; then use a smaller footprint, a planted lot or a shortened branch. Do not keep retrying an impossible site indefinitely.

### Legibility pass

Project the candidate scene before decorating it. Check that a near roof does not hide every useful destination behind it, that adjacent depth bands do not merge into one wall of facades, and that narrow routes remain inferable. Adjust selected openings, setbacks or foreground vegetation rather than widening every street.

## Street graph and lot allocation

The town grid is a connected network fitted to land, with an art-directed irregularity and a separate parcel layer.

### Graph representation

Nodes represent junctions, stairs, bridgeheads, exits and destinations. Edges carry a path, elevation samples, width, route type, slope and district. Keep world-space travel width separate from the narrow amount of paving visible in the picture.

### Route hierarchy

Use one or two primary walking routes through a town, with local lanes and short alleys branching from them. Prefer contour-following paths on hills. Bridges cross exclusions only through explicit bridge edges. Give stairs a distinct route type.

### Lot frontage

Sample frontage along route edges. Vary width and setback within the chosen district. Attach each lot entrance to a reachable edge. Reserve a rear depth and a level placement patch or stepped support before selecting a house.

### Public lots are parcels

- Park: planted surface, boundary or gate, a bench and a readable tree canopy.
- Playground: a separate enclosure, safe ground patch and a few legible equipment silhouettes.
- Plaza: a compact paved plot with two or three architectural edges and one focus such as a well, tree or fountain.
- School: a civic building and its yard may occupy linked parcels. Keep yard access and the play lot identifiable.

### Slope starts

For a world-space prototype, try comfortable lanes up to about 8 degrees, short steep lanes up to 14 degrees, and steps beyond that. These are art and layout starting values, not accessibility or engineering standards. Judge projected legibility separately from world slope.

### Connectivity checks

Reject entrances inside walls or water, stairs ending in cliffs, disconnected outer houses and a plaza used as a highway junction. Preserve clearance along the reachable route.

## Stacking terrain, streets and buildings

Each depth band is a shallow inhabited slice, with its own ground, street and lots. Front slices overlap pieces of the slices behind.

See the schematic in the PDF, page 13.

### Support first

Give each ground profile a filled land mass beneath it, enough vertical overscan, a front lip and optional rock or soil cut. A house must contact a supported patch. Use walls, terraces and steps where the patch changes height.

### Terrain and streets

Lay paving and its edge mask on a ground patch. Fill neighboring parcels with soil, garden or grass. Project a narrow strip of roadway into view, then let fences, foundations and planted edges interrupt it.

### Buildings and foreground

Place rear vegetation, buildings and attached details on the parcel. Add ground props, fences, shrubs and tree portions in front as needed. A near roof or crown can hide a farther street without removing that street from the graph.

### Depth separation

Leave enough visual separation for mist and atmosphere between inhabited bands. Do not bake one complete town row into a single opaque rectangle. Export terrain and large structures with useful alpha silhouettes and occlusion masks.

## Draw order and occlusion

Use a deliberate back-to-front composition. Screen height alone cannot sort objects correctly on hills, bridges and tall buildings.

| Pass within one inhabited band | What it contains | Sorting and mask rule |
| --- | --- | --- |
| Terrain support | Land fill, cliffs, back banks and surfaces. | Supports all parcels. Water and ravine openings use explicit masks. |
| Rear natural elements | Far trunks, hedges and vegetation behind lots. | Depth anchors place them behind the buildings they border. |
| Ground and street | Lane, parcel surfaces, ground pigment and contact shadows. | Clip to ground masks; reserve routes before planting props. |
| Structures | Buildings and fixed civic equipment with their internal stacks. | Sort by local depth and contact within the band; preserve authored overlaps. |
| Attached and ground props | Awnings, lamps, tables, gates, fences and street furniture. | Use attachment sockets or grounded anchors; separate rear and front pieces. |
| Foreground lips and foliage | Shrubs, near tree sections, terrain edge and bank detail. | Cover joins deliberately while retaining entrances and focal places. |
| Gap atmosphere | The mist sheet belonging in front of this band. | Insert before the next nearer band; mask by its own terrain and occlusion plan. |

Use logical depth bands plus local occlusion dependencies and stable tie-breaks. A bridge can require support, rear railing, deck, actors and front railing packets. Split a tall tree into rear canopy/trunk/front canopy when necessary. Resolve cycles by splitting the conflicting artwork, not by arbitrary frame-to-frame reordering.

## Architecture: historic and vernacular

The kit should feel regionally related, with variation in silhouette, age and use rather than a random collection of European landmarks.

### Attached townhouses

Use narrow two- to four-storey facades, uneven eaves, steep pitched roofs, varied gables and a few dormers. Shared walls establish dense blocks. Alternate plaster, modest stone bases and occasional timber framing. Keep side elevations and end-wall variants available for block corners.

### Detached homes

Use one- to three-storey plaster or stone homes, cottages and modest villas. Roofs may be pitched, hipped or clipped. Give them entrance steps, garden boundaries and plausible rear extensions. Foundations should support slopes without tilting the house.

### Farm buildings

Use barns, sheds and farmhouses with larger doors, simpler window rhythms and weathered timber or masonry. Add hay or tools in restrained grouped props. Avoid decorating barns like shops.

### Facade logic

- Floors share consistent sill and lintel bands; windows align in believable bays.
- Doors have a reachable ground threshold. A shopfront belongs at street level.
- Timber members form a designed frame, not random dark stripes.
- Chimneys sit on plausible roof positions. Dormers respect pitch and ridges.
- Shutters and window boxes attach to the opening family they were authored for.

### Roofs

Author roof silhouette, eave shadow, roof material, ridge, verge and chimney junctions separately where reuse is useful. Keep tile or slate scale consistent across buildings. Supply gable-end, corner and roof-end solutions so rows terminate cleanly.

### Reference roles

REF-S02-S04 and REF-U01 provide historic detail cues. REF-T01-T05 show how these types give way to looser residential streets.

## Architecture: modern buildings and civic uses

Modernity comes through form, openings and construction detail while retaining the same watercolor treatment.

### Later residential and modern kit

Separate late villas and simple postwar walk-ups from contemporary homes and infill. Modern variants use restrained brick, pale render, timber panels, larger rectangular openings, recessed balconies and low-pitch or flat roofs. Give flat roofs a parapet, subtle coping and drainage details.

### Infill behavior

Match the adjacent frontage height where useful, then vary a few rooflines and setbacks. Modern buildings should form pockets or districts with plausible shared materials. Use REF-U03 for scattered infill, REF-U04 for postwar neighborhoods and REF-U05 for a more contemporary mix.

### Scale discipline

A modern block may span multiple frontage units. Keep its doors, floors, balcony rails and people at the same local scale as neighboring houses.

### Recognizable uses

- Cafe or restaurant: a broad entrance or shop window, awning, restrained tables, menu board and warm interior.
- Bakery: bread display, shop opening and a distinct awning or hanging sign.
- School: regular classroom bays, a clear central entrance and a linked yard; a clock or modest bell can identify older schools.
- Library or community center: larger civic entrance and transparent ground-floor opening.
- Farm inn: a modest domestic building with a few public frontage props, not a city restaurant pasted into a field.

### Hero assets

Church, town hall, school, library, inn, bakery corner, covered market and community center are the initial civic set. Author one complete readable design for each before producing extra skins. Several functions can share a shell when the town is small.

### Signage

Keep signs small and editable. Use separate text or symbol layers. Avoid permanently rasterized nonsense lettering in production exports.

## Building library and variation budget

Proposed production target: 60 authored building shells. Count distinct silhouettes, not recolors or mirrored copies.

| Shell family | Target | Variation to author deliberately |
| --- | --- | --- |
| Attached historic townhouses | 12 | Different widths, gables, eaves and end-wall conditions; include corners. |
| Detached historic houses and villas | 8 | Different footprints, roof types, entrances and garden-facing sides. |
| Vernacular cottages | 8 | Low plaster, stone and timber forms with regional consistency. |
| Later residential buildings | 8 | Villas, postwar walk-ups and modest pitched-roof apartment houses. |
| Contemporary buildings | 8 | Flat or low roofs, brick/render/timber, balcony and opening rhythms. |
| Farmhouses and outbuildings | 8 | Farmhouse, barns, sheds and covered working spaces with distinct silhouettes. |
| Civic and service anchors | 8 | Church, town hall, school, library, inn, bakery corner, market shelter and community center. |
| Total | 60 | A shell includes a coherent silhouette and usable floor/opening layout, with its required masks and anchors. |

Build a 14-shell vertical slice first: 6 attached historic, 3 detached, 2 modern, 1 barn, 1 school and 1 inn. Expand only after scale, terrain placement and material stacking are approved. Civic shells may contain a default facade design, but their reusable detail components are catalogued separately.

## Reusable architectural components

These counts are starting budgets for separately authored component designs. Compatibility matters more than the theoretical number of combinations.

| Component family | Target | Required coverage |
| --- | --- | --- |
| Wall materials | 12 | Plaster, stone, brick and timber families with subtle, tileable pigment variation. |
| Roof designs and materials | 20 | 8 tiled pitched, 6 slate pitched, 4 hipped/clipped and 2 flat-roof treatments; compatible ends and ridges. |
| Window designs | 16 | Historic small-pane, taller town, civic, rural and broad modern openings. |
| Door designs | 8 | Domestic, shop, civic and farm thresholds, with open/closed or light states where useful. |
| Shopfront templates | 8 | Cafe, restaurant, bakery, general shop and restrained modern glass frontages. |
| Dormers / chimney sets | 8 / 8 | Compatible with roof pitch and material; provide junction or flashing masks. |
| Trim / balcony sets | 12 / 8 | Sills, cornices, stone or timber trims, wrought iron and modern balcony families. |
| Awnings / sign mounts | 8 / 8 | Grouped shapes and materials, plus editable lettering or symbols. |
| Weathering / climbing growth | 12 / 12 | Masked rain stains, chipped pigment, moss and separate ivy or vine silhouettes. |

Provide compatibility tags such as roof_pitch, wall_family, opening_bay and style_family. A roof and window selected independently must still fit the shell. Seasonal and wetness states reuse the same registration and pivot.

## Compositing one building

Author a clean structural silhouette, then add clipped pigment, openings and decorations through explicit masks and sockets.

| Back-to-front order | Asset or layer | Constraint |
| --- | --- | --- |
| 1 | Contact shadow, rear extension and rear props | Grounded at the root; shadow follows the support patch. |
| 2 | Wall body and visible side plane | Use a clean silhouette mask and a coherent material assignment. |
| 3 | Wall pigment, granulation and repairs | Clip to wall; preserve openings and trim exclusions. |
| 4 | Openings, recesses, frames and shutters | Snap to bay and floor anchors; doors need reachable thresholds. |
| 5 | Trim, structural timber and fixed facade elements | Align to authored bands; avoid overlapping incompatible trims. |
| 6 | Roof silhouette, material, eave shadow and ridge | Roof masks overlap the wall correctly; tile scale remains consistent. |
| 7 | Dormers, chimneys, balconies and storefront parts | Use type-specific sockets and front/rear sublayers at roof junctions. |
| 8 | Mounted signs, awnings, planters and climbing growth | Respect clearance, window/door exclusions and gravity. |
| 9 | Grounded frontage props and wet/light accents | Tables, pots and steps attach to the ground; glass light is clipped. |

Keep dark recesses, frame detail, glass color and window light separable where animation or weather changes are needed. Paint at least one completed example per family to show the intended final stack. Global paper texture and final distance treatment come after object assembly.

## Decoration without visual clutter

Use a few coherent decoration clusters per lot, with empty space left deliberately.

### Proposed frequency starts

- Core shops: one identifying frontage cluster, such as awning + sign + a few tables or bread display.
- Homes: decorate about 30-50% with one small cluster; keep neighboring choices related.
- Balconies and window boxes: choose from compatible openings, with repeats grouped by household.
- Growth: concentrate on suitable walls, garden boundaries and roof joints. Keep the front door legible.
- Street furniture: place around destinations and junctions rather than at fixed intervals across every band.

### Cluster authoring

Author a cafe table group, a doorway planter pair, a garden gate group and a small orchard working group as optional reusable arrangements. Allow a few pieces to vary while preserving the composition and circulation clearance.

### Hard placement constraints

- Doors, route corridors, stair treads and playground access stay clear.
- Signs and awnings attach to wall sockets and do not float.
- Ivy and stains use allowed masks; furniture cannot spawn inside trees or fountains.
- Modern balcony details do not attach to medieval gable sockets.
- Letters, directional lighting and asymmetric drainage prevent arbitrary mirroring.

### Avoid repetition

Track recent silhouettes and prop clusters within a street neighborhood. Start with no identical shell beside itself and at most two matching silhouettes within six neighboring lots. Break the rule only for an intentional terrace or apartment ensemble.

### Color and age

Choose a small palette per district, then make modest per-lot adjustments. Assign one age and maintenance state per property so facade damage, roof repairs and garden condition agree.

## Streets and public-lot assets

Each public use needs its own ground, edges, entrances and front/rear props so it can occupy an ordinary parcel.

| Asset set | Proposed authored designs | What must be included |
| --- | --- | --- |
| Lane surfaces | 12 | 4 cobble, 4 gravel, 4 dirt; separate painted edges, wetness and junction coverage. |
| Joins and turning pieces | 12 | T and Y junctions, bends, dead ends and narrowing transitions. |
| Stair assemblies | 8 | Short and long flights, landings and sloped side-wall solutions. |
| Bridge assemblies | 6 | Small stone and timber crossings; split deck, supports and rear/front rails. |
| Park lots | 6 | Small planted ground variants with gate, paths, bench positions and canopy clearances. |
| Playground lots | 4 | Ground patch and fence variants; compatible swing, slide and seesaw pieces. |
| Plaza lots | 6 | Bounded paving layouts with well, tree, fountain or market focus; clear approach. |
| Furniture and frontage props | 24 | Benches, lamps, bins, bollards, tables, chairs, menu boards, pots and utility items. |
| Boundary sets | 16 | 6 low walls, 6 fences, 4 hedges; corners, end posts, gates and sloped steps. |

The count refers to distinct reusable designs or assembly templates. Produce matching join pieces and masks as part of each design, rather than counting every corner as a new variant. A playground should read from its equipment silhouette before tiny detail is added.

## Assembly recipes for outdoor lots

Use the same grounded, masked assembly approach for streets and public places as for buildings.

| Lot type | Back-to-front stack | Constraints and variation |
| --- | --- | --- |
| Street or alley | Ground support > paving pigment > edge breakup > drain/puddle masks > rear props > frontage structures > near props. | Protect the route corridor. Vary material patches and edge wear more than overall street width. |
| Pocket park | Soil/grass patch > paths > planting beds > rear boundary > trees/bench > front shrubs and gate. | Use 6 lot layouts and varied tree/bench combinations. Keep the gate connected and the canopy readable. |
| Playground | Level support > ground surface > rear fence > equipment > entry path > front fence and planting. | Use 4 lot layouts. Swings and slides need footprint, clearance, front/rear pieces and optional motion anchors. |
| Plaza | Bounded ground > paving texture > compact focus > surrounding frontage props > near edge detail. | Use 6 layouts. Keep the well/tree/fountain within a real lot and preserve an approach around it. |
| Garden or allotment | Soil patch > beds/furrows > greenhouse or shed > crops > boundary/gate > scattered working props. | Group crop and maintenance states. Match planting rows to terrain rather than to screen pixels. |
| Bridge or crossing | Terrain gap > far support/rail > deck > grounded crossing objects > near rail > near bank. | Keep a consistent connection height. Mist and water below are separate depth packets. |

Avoid baking all vegetation, furniture and shadows into one ground tile. Separate pieces that need local variation, motion, interaction or occlusion. A small number of completed assembly examples should accompany the production kit.

## Landscape and water asset library

Terrain, vegetation and fields carry most of the composition in small settlements. They need as much variation discipline as the houses.

| Asset set | Proposed authored designs | Assembly notes |
| --- | --- | --- |
| Terrain profile treatments | 12 | Brush/edge families for gentle, rolling, convex, concave, shelf and steep land; pair with filled support geometry. |
| Grass / soil materials | 8 / 6 | Tileable low-contrast pigment with patch masks and edge breakup. |
| Rock and cliff faces | 12 | Different cut heights, exposed seams, protrusions and vegetation pockets. |
| Water and bank treatments | 8 / 8 | Stream, river, lake, sea and marsh variations; far/near banks, shoreline feather and ripple overlays. |
| Field parcels | 8 | Harvested, furrowed, meadow, vegetable and orchard bases with boundaries. |
| Deciduous / conifer trees | 12 / 8 | Distinct silhouettes, scale classes and separated canopy/trunk pieces when needed. |
| Fruit trees / shrubs | 6 / 12 | Orchard families and grouped shrubs, including sparse forms. |
| Ground-cover clusters | 16 | Reeds, grass, fallen leaves, moss and restrained flowers. |
| Far woodland strips | 8 | Seam-compatible crown rhythms and soft depth masks. |

Tree dimensions are tied to species/class and scene scale. Author enough sparse variants to leave view corridors. Use world-aligned pigment variation so adjacent parcels do not expose a rigid tiling grid. Keep shoreline, stream and vegetation motion masks separable.

## Natural assets and surface states

Natural elements need structure, contact, boundaries and editable states; texture scattering alone will not produce the reference compositions.

### Trees and woodland

Build a tree from contact/shadow, trunk, major branch structure and canopy groups. Split rear and front canopy only where it helps an overlap. Keep species silhouettes distinct. Far woodland strips use soft crown rhythms and a clean alpha edge, with enough overlap or matching borders to join.

### Terrain surfaces

Use a broad base wash, a low-contrast material layer, masked pigment patches and a designed front edge. Add cut soil or rock where the profile exposes it. Rock modules need vegetation pockets and support anchors, not just a repeated texture.

### Fields and orchards

Treat fields as parcels with a crop family, row direction, age/harvest state and boundary. Deform their rows to the ground shape. Orchard spacing can be regular locally while gates, paths and missing trees break the larger pattern.

### Water stack

Draw the support or far bank, a depth/base wash, low-contrast color variation, separate flow or ripple highlights and the near bank. Clip reflections and ripples to water masks. Keep foam at plausible edges and crossings, and preserve bridges as separate objects.

### Wet and seasonal states

Use masks to deepen exposed surfaces and add a few glints. Water does not need a mirror-bright stripe across every lane. Share a seasonal palette per vegetation family; vary fallen leaves and bare gaps at parcel level.

### Motion-ready parts

Keep water highlights, flexible foliage groups, hanging signs and playground moving parts available as separate optional layers. Keep static painterly marks and global paper grain stable. The initial prototype should prioritize the requested rolling mist before adding many competing animations.

## Terrain assembly and grounded placement

Use geometry or filled 2D profiles for support, then paint the surfaces and edges. A terrain image alone does not define a usable placement surface.

### Projection convention

Proposed world coordinates are x along the panorama, d increasing away from the viewer, and h positive upward. One world frontage unit projects to F = 72 pixels at the near reference plane. Sprite pixel y increases downward.

```
q = depth_scale(d)
screen_x = cx + (x - camera_x) * F * q
screen_y = band_baseline(d) - h * F * q
```

This is an art-directed shallow projection, not a physical perspective camera. Sample the same terrain h(x,d) for building roots, street edges and their shadows. Keep the profile data and painted ground aligned.

### Foundations

Fit the usable footprint to a level patch or create a terrace. Use a stepped plinth, retaining wall or cut into the slope. Keep the building vertical. A house must not hover between two sampled endpoints.

### Profile joins

- Blend adjacent height profiles and verify their derivatives where routes cross.
- Extend land fill below the lowest visible edge and overscan beyond the frame.
- Use front lips, shrubs and wall returns to hide planned joins, while retaining clean alpha masks.
- Handle stream, gorge and cliff openings through exclusions and bank geometry rather than painting over a solid foreground strip.

### Slope and access

Evaluate slope in world units. Do not stretch a flat lane texture up a steep projected hill and assume it is walkable. Place a stair or switchback connector, or mark the parcel unsuitable. Keep a useful flat entrance landing.

### Parallax

Use modest depth-dependent movement. Overscan large silhouettes and mist sheets enough to cover the camera range. Recheck occlusion and edge joins at both extremes of the allowed motion.

## Rolling mist: asset-designer brief

Mist should drift through the spaces between inhabited layers, pool in low ground and reveal the town gradually.

### Artwork to deliver

- 8 broad seamless mist-density sheets with soft, varied silhouettes.
- 4 thinner wisp shapes for valleys, streams and the gaps between streets.
- 4 reusable vertical or terrain-conforming falloff masks.
- 2 seamless low-frequency noise fields for distortion and density modulation.
- One layered source example showing how these components combine, separate from the concept paintings.

### Material character

Use cool gray-white pigment with very low contrast. The cloud should read through gradual changes in opacity and subtle edge breakup, without a dark outline, a repeated cloud stamp or a hard rectangular boundary. Texture detail should remain broader than fine architectural marks.

### Mask coverage

Provide ample transparent margin and wrap-compatible borders for sheets that tile. Keep the alpha or grayscale density editable. Do not paint buildings, terrain or paper grain into the mist textures.

### Terrain response

A valley can hold a deeper low mist layer while a ridge remains visible above it. A shoreline can receive a thin horizontal wisp. Define density from elevation, water proximity and sheltered low areas, then feather the boundaries.

### Depth response

A sheet in front of a far street should veil it while a nearer roof remains crisp. A later sheet can cross the nearer street. Keep foreground and important focal places less veiled than distant neighborhoods.

### Animation handoff

Supply a static density view plus a proposed motion direction and scale range. The developer should be able to animate the field through offsets and slow distortion. This is a new production brief; no finished mist animation has been created or validated by the study.

## Rolling mist: compositing in depth

Insert atmosphere between render packets. A single overlay across the whole screen cannot produce the required near/far relationships.

See the schematic in the PDF, page 27.

### Layer integration

Draw the far ground and structures, then the mist in front of them, then the next nearer band. Repeat where useful. Apply local terrain masks to avoid filling the wrong side of a cliff or covering a foreground house with a far-gap sheet.

### Tall objects

A tower, tree or bridge may cross a gap. Author or derive a suitable depth/occlusion mask, or split it into coherent draw packets. Do not clip mist by one flat horizontal line through the object's silhouette.

### Density and alpha

A useful renderer-independent starting rule is alpha = 1 - exp(-tau), with tau an artist-controlled nonnegative optical density field. Begin with about 0.03-0.18 alpha for a single moderate gap, then tune the combined result.

### Cumulative veiling

For overlapping sheets, combined alpha is 1 - product(1 - alpha_i). Many subtle sheets can still wash out the town. Review a central facade, school, plaza and far roofline together. Use a consistent color space and the renderer's declared alpha convention.

## Rolling mist: motion and controls

Mist moves slowly and coherently, with different depths sharing the same broad weather direction.

### Suggested motion starts

- Broad drift: about 0.5-3 virtual pixels per second at the reference viewport.
- Long density changes: about 80-240 seconds, with independent phase offsets.
- Wisps: around 6-18 frontage units wide, with feathering of roughly 0.3-1 frontage unit.
- Keep distortion low-frequency and low-amplitude. The effect should remain calm while the architecture stays stable.

```
n1 = noise(uv * scale1 + wind1 * time)
n2 = noise(uv * scale2 + wind2 * time)
density = base_mask * terrain_falloff
density *= blend(n1, n2, detail_mix)
a = 1 - exp(-max(0, density) * strength)
```

Choose noises and offset paths that tile or crossfade without a visible jump. Use periodic offsets or blend between matching endpoints if the product needs a loop.

### Expose useful controls

Give art direction access to global strength, per-gap strength, altitude falloff, pooling bias, drift speed, wind direction, wisp amount and edge feather. Keep these controls separate from rain intensity and the static distance palette.

### Stability and performance

Use deterministic seeds and stable time. Avoid rebuilding masks or changing object order every frame. Start with a small set of shared density textures and masks; profile overdraw at the target device and display size before adding more sheets.

### Interaction and accessibility

Allow reduced motion and a mist intensity control. Picking should use visible object masks and logical hit areas, with an art-directed opacity policy. Fully hidden objects should not create confusing foreground hover feedback.

### Distance treatment

Static depth tint and mist should be tuned together. Do not bake strong fog into every production sprite and then add the same fog again at runtime.

## Asset files, masks and naming

The designer delivers editable layered sources and aligned runtime exports. The concept-image filenames are a separate reference catalogue.

| Deliverable | Convention | Important metadata |
| --- | --- | --- |
| Master source | Layered PSD, Krita or equivalent native file agreed with the team. | Logical layer names, paint scale, sockets and editable masks. |
| Runtime color sprite | RGBA PNG, straight alpha; paint in sRGB. | Declare pivot, reference scale, trim rectangle and alpha convention. |
| Masks | Separate aligned grayscale PNGs for silhouette, material, wetness, growth and occlusion as needed. | Linear data sampling; matching dimensions and registration. |
| Socket and shape data | JSON sidecar in world frontage units or normalized source pixels, explicitly labelled. | Entrance, windows, signs, roof joints, ground contact, footprint and bounds. |
| Variant naming | bld_hist_attached_03_wall_color_v01.png; corresponding mask and socket names. | Family, component, design ID, state and version remain stable. |
| Terrain or street pieces | ter_rock_shelf_02_color_v01.png; str_cobble_bend_01_color_v01.png. | Join anchors, allowed slope range, material and connection types. |
| Mist pieces | fx_mist_sheet_03_density_v01.png with separate falloff or noise. | Tile axes, suggested scale, feather, local motion and density range. |

Author at least 2x the agreed near-plane display size for the initial 1080p composition, then validate downsampling. Keep transparent padding, with a proposed minimum of 8 source pixels around soft sprites at 2x and more for wide feathering. Atlas packing, mip padding and any premultiplication happen under the engine import contract. Export masks as data, without painted gamma changes.

## Asset metadata and an example contract

Use metadata to preserve the designer's intended assembly. These examples are proposals, not an implemented engine API.

### Every reusable asset needs

- Stable ID, version, family, style and material tags.
- Reference unit size, source dimensions, pivot and trim offset.
- Footprint, silhouette/occlusion data and entrance or connection anchors.
- Allowed sockets and forbidden regions for details.
- Compatible roof, opening, foundation, terrain and neighbor types.
- State support, such as wet, lit, seasonal or moving, and whether mirroring is safe.

### Coordinate declaration

Choose one source-anchor convention. The examples use u,v in normalized source pixels with origin at top left and y downward. World footprints use x,d,h in frontage units, with h upward. Convert through an explicit importer rather than mixing these spaces.

### Compatibility failure

If an optional attachment does not fit, omit it or choose a compatible fallback. Preserve the shell and lot. Log missing mandatory data for correction instead of silently accepting a floating doorway.

```
{
  "asset_id": "bld_hist_attached_03",
  "version": 1,
  "style_family": "historic_plaster",
  "world_width_f": 0.9,
  "world_height_f": 1.45,
  "pivot_uv": [0.50, 0.96],
  "alpha": "straight",
  "can_mirror": false,
  "sockets": {
    "entrance": [0.45, 0.91],
    "sign": [0.25, 0.70]
  },
  "compatible_roof": ["steep_tile"],
  "masks": {
    "wall": "wall_mask.png",
    "growth": "growth_mask.png"
  }
}
```

The downloadable example JSON files extend these fields with state and rendering notes. They are documentation examples; they do not refer to completed production sprites in this package.

## Scene recipe and resolved scene data

Separate intent from the generated result, so designers can reproduce and adjust a town without losing its structure.

### Recipe controls

Store seed, viewport, frontage scale, terrain preset, center location, density curve, architectural district weights, public-lot requirements and weather settings. Give terrain and settlement size independent controls.

```
{
  "recipe_id": "transition_foothill_01",
  "seed": 7419,
  "viewport": [1920, 1080],
  "frontage_px": 72,
  "terrain": "foothill_steps",
  "density": {
    "axis": "world_x",
    "core": 0.85,
    "edge": 0.08,
    "taper_start": 0.25,
    "taper_end": 0.90
  },
  "weather": {"mist_enabled": true}
}
```

### Resolved result

- Terrain profiles and exclusions, with identifiers for banks, ledges, water and cliffs.
- Graph nodes and edges, their route types, ground samples and reachable destinations.
- Lots, land uses, building roots and footprint assignments.
- Asset choices, socket attachments, material variations and state seeds.
- Draw packets, occlusion dependencies and gap-mist assignments.
- Interaction and sound anchors bound to stable lot/object IDs.

### Weather reproducibility

Keep weather seed and time origin distinct from layout seed. Save a still-preview weather state so a developer and designer can inspect the same moment. Disabling mist should preserve the rest of the scene exactly.

### Serialization

Version the recipe and the resolved scene format. Retain existing values when importing older scene data, and apply documented defaults for new optional controls. Engine implementation is outside this document.

## Soundscape and interaction anchors

Keep semantic places in the generated data so the visual town can also support local listening and interaction.

### Lot-level semantics

Attach place tags such as cafe, bakery, schoolyard, orchard, woodland, water and sheltered arcade. Keep a primary focus anchor and optional entry or path anchors. Derive horizontal sound position from the projected location and depth treatment from logical distance.

### Material semantics

Tag surfaces as stone, cobble, timber, gravel, soil, foliage, glass or water. These can drive local footfall, rain and contact sounds later. Do not infer sound material from random color alone.

### Useful reference examples

REF-S02 suggests rain at the edge of an arcade. REF-S06 supplies school and playground focus points. REF-L01 and REF-L06 separate water below from paths above. REF-L10 leaves room for wind and distant environmental detail.

### Visibility and picking

Use stable object IDs with dedicated hit regions, not a changing color in the final painting. Apply occlusion and foreground masks so hidden lots do not steal a visible neighbor's pointer input.

### Shelter and depth

A covered frontage or rear courtyard can support a different acoustic state. Keep shelter, depth and graph connectivity separate: something visible across a gorge may be close on screen but far away along a path.

### Mist behavior

Mist is initially a visual weather control. It should not automatically mute a whole street or change sound reach. Any later acoustic effect needs its own intentional rule.

### Scope

This handoff defines anchor data and visual implications. It does not supply an audio library, a mixing system or measured acoustic parameters.

## Prototype, review and acceptance

Validate the assembly rules on a small slice before expanding the proposed asset budget.

### A useful first slice

- Use the 14-shell starter kit and three connected street bands.
- Include one slope, a short stair connection, a shop, a school/play lot, a park and a tiny plaza.
- Add at least one historic-to-modern frontage transition.
- Add two interleaved mist gaps, one tall object crossing a gap, and a moving camera test if parallax is planned.

### Review in this order

Approve framing and ordinary-house scale first. Then inspect terrain support, street connectivity, density taper and focal visibility. Only after these pass should the team refine pigments, decoration density and mist motion.

### Reference comparisons

Compare a large filled town to U01, a real taper to T01 or T03, a dramatic landform to L01 or L06, and an empty rural composition to S09 or L10.

### Developer checks

- Same seed and recipe reproduce the same layout and attachments.
- Density decreases across both front and rear bands in a taper recipe.
- Entrances are reachable; structures are supported; exclusion areas remain clear.
- No visible terrain seams, floating props, invalid roof joints or changing sort order.
- Mist is correctly behind nearer silhouettes, has no hard sheet seams and does not wash out the scene.
- The frame remains covered at camera extremes and the target display sizes.

### Designer review checklist

Every asset family has a completed assembly example, aligned masks, named layers, consistent pivots, compatible sockets and adequate edge padding. Shape variation remains visible at final viewing size, not just at source resolution.

### Performance and sign-off

Set frame-rate, memory and device targets with the implementation team. Measure overdraw and texture use in the prototype. Asset counts and shader suggestions in this guide have not been benchmarked. Record approved deviations before full production.

## Current reference descriptions

### REF-S01 - The old quarter

An isolated historic quarter sits within a wider valley. Use its small building scale and the contrast between settlement and countryside.

Developer note: Keep the camera fixed when changing settlement size. Alter lot count and footprint instead of enlarging houses.

Sound direction: In the café court, bring cup clinks and footsteps close. Muffle them as focus moves behind the corner.

File: [images/current/REF-S01_the-old-quarter.png](../images/current/REF-S01_the-old-quarter.png)
PDF page: 37

### REF-S02 - The arcades

Arcaded frontages make a dense but bounded market town. Recessed walkways and small courts distinguish shop lots.

Developer note: Tag porticoes as sheltered frontage. Keep supports and passable openings on consistent anchors.

Sound direction: Move under an arch to soften the rainfall. Let individual drops from the eaves strike the paving just beyond it.

File: [images/current/REF-S02_the-arcades.png](../images/current/REF-S02_the-arcades.png)
PDF page: 38

### REF-S03 - Weavers' lanes

Timber gables and artisan workshops diversify the silhouette. Roof heights and materials vary within a coherent old district.

Developer note: Select related timber patterns per district and enforce a roof-height variation budget.

Sound direction: Give one workshop a loom shuttle. Let its dry wooden tap carry a short distance along the wet lane.

File: [images/current/REF-S03_weavers-lanes.png](../images/current/REF-S03_weavers-lanes.png)
PDF page: 39

### REF-S04 - The terraced town

A compact town uses retaining walls, stair links and irregular terraces. Terrain relief is gentler than the later L studies.

Developer note: Keep house baselines level while foundation steps absorb changes in ground height.

Sound direction: Follow a flight of steps. Shift the footfall to wet stone, then soften it when the landing slips behind a wall.

File: [images/current/REF-S04_the-terraced-town.png](../images/current/REF-S04_the-terraced-town.png)
PDF page: 40

### REF-S05 - Market crossroads

A covered market forms a local center where narrow routes meet. Housing loosens around it.

Developer note: Reserve the market as a bounded lot before streets and facade decoration are resolved.

Sound direction: Let rain patter on the market roof. Bring up the quieter murmur underneath as the listener enters the stall.

File: [images/current/REF-S05_market-crossroads.png](../images/current/REF-S05_market-crossroads.png)
PDF page: 41

### REF-S06 - School street

The school and playground form a recognizable civic pair within mixed residential streets.

Developer note: Reserve the school footprint and play lot together, then keep their entrances linked to the street graph.

Sound direction: Ring the school bell once on focus. Carry a softer version into the next street while the rain continues.

File: [images/current/REF-S06_school-street.png](../images/current/REF-S06_school-street.png)
PDF page: 42

### REF-S07 - The garden town

Detached homes, greenhouses and gardens take more frontage. A short commercial group anchors the center.

Developer note: Garden and greenhouse lots provide low built density without simply removing all street activity.

Sound direction: At the park gate, bring out drips collecting in the leaves. Let the café voices recede behind the hedge.

File: [images/current/REF-S07_the-garden-town.png](../images/current/REF-S07_the-garden-town.png)
PDF page: 43

### REF-S08 - The orchard village

An orchard separates two small groups of houses. Productive landscape becomes part of the settlement.

Developer note: Place orchard rows in agricultural parcels. Break their rhythm near gates and paths.

Sound direction: Move from shelter into the orchard. Trade drips from the eaves for the softer patter of rain on fallen leaves.

File: [images/current/REF-S08_the-orchard-village.png](../images/current/REF-S08_the-orchard-village.png)
PDF page: 44

### REF-S09 - Along the farm lane

A rural ribbon of houses and barns sits among open fields. The inn and its neighbors provide one gathering place.

Developer note: Keep the lane narrow and continuous. Use barns and fences as distinct rural lot types.

Sound direction: Give the farm lane a gravel footfall. A gate opening adds a brief timber creak against the steady rain.

File: [images/current/REF-S09_along-the-farm-lane.png](../images/current/REF-S09_along-the-farm-lane.png)
PDF page: 45

### REF-S10 - The hamlet square

A few buildings enclose an intimate well court. Fields and meadow dominate the wider view.

Developer note: Stop spawning houses once the hamlet count is met. Use the remaining space for landscape.

Sound direction: Let a cup set down outside the inn be audible in the little square. Out in the meadow, leave room for rain and wind.

File: [images/current/REF-S10_the-hamlet-square.png](../images/current/REF-S10_the-hamlet-square.png)
PDF page: 46

### REF-U01 - Continuous old town

Historic blocks fill the available view through many small buildings and layered streets.

Developer note: Increase building count and depth bands while preserving the established small facade scale.

Sound direction: Try the changing shelter of arcades, enclosed courts and narrow lanes as the listener moves through the old town.

File: [images/current/REF-U01_continuous-old-town.png](../images/current/REF-U01_continuous-old-town.png)
PDF page: 47

### REF-U02 - Dense town with garden districts

Dense historic streets contain garden districts and civic openings. This is a sprawl reference; T01-T05 govern a true taper.

Developer note: Do not infer a density gradient from this image. Use the later transition family for thinning streets.

Sound direction: Let café activity thin out toward the garden streets, where drops from hedges and individual footsteps become more distinct.

File: [images/current/REF-U02_dense-town-with-garden-districts.png](../images/current/REF-U02_dense-town-with-garden-districts.png)
PDF page: 48

### REF-U03 - Historic streets with modern infill

Modern infill appears within historic blocks. Balconies, flat roofs and broad civic windows add a second architectural language.

Developer note: Modern modules need separate roof, opening and balcony rules, with shared watercolor treatment.

Sound direction: Compare rainfall on glass canopies, timber cladding and the stone thresholds of older shops.

File: [images/current/REF-U03_historic-streets-with-modern-infill.png](../images/current/REF-U03_historic-streets-with-modern-infill.png)
PDF page: 49

### REF-U04 - Old quarter and postwar neighborhoods

A historic center connects to postwar walk-up apartments, villas and newer homes.

Developer note: Use district-level architectural weights to form neighborhoods rather than random style changes per house.

Sound direction: Give the schoolyard, apartment court and café square separate local ambiences, with softer sound from the streets behind.

File: [images/current/REF-U04_old-quarter-and-postwar-neighborhoods.png](../images/current/REF-U04_old-quarter-and-postwar-neighborhoods.png)
PDF page: 50

### REF-U05 - Contemporary town around an old core

Contemporary low-rise buildings surround a recognizable old core. Modern roofs and larger openings remain softly painted.

Developer note: Balance modern and historic massing. Civic anchors should remain identifiable at the distant camera.

Sound direction: A sheltered community-center entrance and the open old square offer two different listening spaces within the same neighborhood.

File: [images/current/REF-U05_contemporary-town-around-an-old-core.png](../images/current/REF-U05_contemporary-town-around-an-old-core.png)
PDF page: 51

### REF-T01 - Town across the foothills

Dense blocks on the left loosen into terraces, garden streets and a handful of homes at the woodland edge.

Developer note: Inspect the decrease in frontage attachment and increase in open lot width through every depth band. Retain a connected route to the last house.

File: [images/current/REF-T01_town-across-the-foothills.png](../images/current/REF-T01_town-across-the-foothills.png)
PDF page: 52

### REF-T02 - Market streets into orchards

A market center gives way to short housing rows, detached cottages and orchard lanes.

Developer note: Inspect the decrease in frontage attachment and increase in open lot width through every depth band. Retain a connected route to the last house.

File: [images/current/REF-T02_market-streets-into-orchards.png](../images/current/REF-T02_market-streets-into-orchards.png)
PDF page: 53

### REF-T03 - Old core to newer garden homes

An old center and a few modern apartments transition into duplexes, detached homes and open meadow.

Developer note: Inspect the decrease in frontage attachment and increase in open lot width through every depth band. Retain a connected route to the last house.

File: [images/current/REF-T03_old-core-to-newer-garden-homes.png](../images/current/REF-T03_old-core-to-newer-garden-homes.png)
PDF page: 54

### REF-T04 - From town square to stream gardens

A compact center opens into villas, garden plots and a lightly settled stream corridor.

Developer note: Inspect the decrease in frontage attachment and increase in open lot width through every depth band. Retain a connected route to the last house.

File: [images/current/REF-T04_from-town-square-to-stream-gardens.png](../images/current/REF-T04_from-town-square-to-stream-gardens.png)
PDF page: 55

### REF-T05 - The long edge of a small town

An off-center old quarter trails into one loose ribbon of homes, allotments and farmland.

Developer note: Inspect the decrease in frontage attachment and increase in open lot width through every depth band. Retain a connected route to the last house.

File: [images/current/REF-T05_the-long-edge-of-a-small-town.png](../images/current/REF-T05_the-long-edge-of-a-small-town.png)
PDF page: 56

### REF-L01 - The river valley town

Large town, about 145 buildings. Streets occupy sloping valley sides and meet at two narrow river crossings.

Developer note: Make the ground profile control placement, foundations, paths and vegetation. Preserve the landform at thumbnail size.

File: [images/current/REF-L01_the-river-valley-town.png](../images/current/REF-L01_the-river-valley-town.png)
PDF page: 57

### REF-L02 - The coastal hillside town

Large coastal town, about 110 buildings. A steep inhabited headland descends to a small harbor.

Developer note: Make the ground profile control placement, foundations, paths and vegetation. Preserve the landform at thumbnail size.

File: [images/current/REF-L02_the-coastal-hillside-town.png](../images/current/REF-L02_the-coastal-hillside-town.png)
PDF page: 58

### REF-L03 - Shelves above the lake

A town of about 85 buildings occupies stepped natural benches above a misty lake.

Developer note: Make the ground profile control placement, foundations, paths and vegetation. Preserve the landform at thumbnail size.

File: [images/current/REF-L03_shelves-above-the-lake.png](../images/current/REF-L03_shelves-above-the-lake.png)
PDF page: 59

### REF-L04 - The saddle between hills

A town of about 65 buildings follows a saddle that dips between two higher shoulders.

Developer note: Make the ground profile control placement, foundations, paths and vegetation. Preserve the landform at thumbnail size.

File: [images/current/REF-L04_the-saddle-between-hills.png](../images/current/REF-L04_the-saddle-between-hills.png)
PDF page: 60

### REF-L05 - The steep hillside village

About 50 buildings climb a continuous steep slope, linked by stair lanes.

Developer note: Make the ground profile control placement, foundations, paths and vegetation. Preserve the landform at thumbnail size.

File: [images/current/REF-L05_the-steep-hillside-village.png](../images/current/REF-L05_the-steep-hillside-village.png)
PDF page: 61

### REF-L06 - Two neighborhoods over a gorge

About 36 buildings occupy opposite rims of a wooded gorge, connected by a narrow bridge.

Developer note: Make the ground profile control placement, foundations, paths and vegetation. Preserve the landform at thumbnail size.

File: [images/current/REF-L06_two-neighborhoods-over-a-gorge.png](../images/current/REF-L06_two-neighborhoods-over-a-gorge.png)
PDF page: 62

### REF-L07 - The village on the knoll

About 26 buildings wrap a rounded hill, with fields dropping away on both sides.

Developer note: Make the ground profile control placement, foundations, paths and vegetation. Preserve the landform at thumbnail size.

File: [images/current/REF-L07_the-village-on-the-knoll.png](../images/current/REF-L07_the-village-on-the-knoll.png)
PDF page: 63

### REF-L08 - The hamlet in a forest bowl

About 18 buildings rest within a concave woodland basin and climb its lower rim.

Developer note: Make the ground profile control placement, foundations, paths and vegetation. Preserve the landform at thumbnail size.

File: [images/current/REF-L08_the-hamlet-in-a-forest-bowl.png](../images/current/REF-L08_the-hamlet-in-a-forest-bowl.png)
PDF page: 64

### REF-L09 - The raised wetland village

Eleven buildings follow a narrow raised bank above reed beds and flooded meadows.

Developer note: Make the ground profile control placement, foundations, paths and vegetation. Preserve the landform at thumbnail size.

File: [images/current/REF-L09_the-raised-wetland-village.png](../images/current/REF-L09_the-raised-wetland-village.png)
PDF page: 65

### REF-L10 - Farm lane on the mountain contour

Six farm buildings follow a narrow sloping shelf above a broad mountain valley.

Developer note: Make the ground profile control placement, foundations, paths and vegetation. Preserve the landform at thumbnail size.

File: [images/current/REF-L10_farm-lane-on-the-mountain-contour.png](../images/current/REF-L10_farm-lane-on-the-mountain-contour.png)
PDF page: 66

## Historical iterations

### HIS-01 - Original single-street watercolor

Early appearance reference. Buildings are larger and the scene has only one principal street.

File: [images/archive/HIS-01_original-single-street-watercolor.png](../images/archive/HIS-01_original-single-street-watercolor.png)
PDF page: 67

### HIS-02 - First layers of houses

Early layered-house exploration before the streets and terrain were resolved.

File: [images/archive/HIS-02_first-layers-of-houses.png](../images/archive/HIS-02_first-layers-of-houses.png)
PDF page: 67

### HIS-03 - First connected street layout

Early forced-perspective layout with recognizable bakery, school and storefronts. Foreground scale is larger.

File: [images/archive/HIS-03_first-connected-street-layout.png](../images/archive/HIS-03_first-connected-street-layout.png)
PDF page: 67

### HIS-04 - Wider view before road correction

Wider town view with overly broad exposed roads. Preserve for history, not street-width guidance.

File: [images/archive/HIS-04_wider-view-before-road-correction.png](../images/archive/HIS-04_wider-view-before-road-correction.png)
PDF page: 67

### HIS-05 - Narrow streets and public lots

Pocket park, playground and plaza are inserted among buildings. Later series establish the smaller scale.

File: [images/archive/HIS-05_narrow-streets-and-public-lots.png](../images/archive/HIS-05_narrow-streets-and-public-lots.png)
PDF page: 68

### HIS-06 - Earlier The old quarter

Earlier density study before the accepted half-scale revision. Use the corresponding S family for current framing.

File: [images/archive/HIS-06_earlier-the-old-quarter.png](../images/archive/HIS-06_earlier-the-old-quarter.png)
PDF page: 68

### HIS-07 - Earlier The arcades

Earlier density study before the accepted half-scale revision. Use the corresponding S family for current framing.

File: [images/archive/HIS-07_earlier-the-arcades.png](../images/archive/HIS-07_earlier-the-arcades.png)
PDF page: 68

### HIS-08 - Earlier Weavers' lanes

Earlier density study before the accepted half-scale revision. Use the corresponding S family for current framing.

File: [images/archive/HIS-08_earlier-weavers-lanes.png](../images/archive/HIS-08_earlier-weavers-lanes.png)
PDF page: 68

### HIS-09 - Earlier The terraced town

Earlier density study before the accepted half-scale revision. Use the corresponding S family for current framing.

File: [images/archive/HIS-09_earlier-the-terraced-town.png](../images/archive/HIS-09_earlier-the-terraced-town.png)
PDF page: 69

### HIS-10 - Earlier Market crossroads

Earlier density study before the accepted half-scale revision. Use the corresponding S family for current framing.

File: [images/archive/HIS-10_earlier-market-crossroads.png](../images/archive/HIS-10_earlier-market-crossroads.png)
PDF page: 69

### HIS-11 - Earlier School street

Earlier density study before the accepted half-scale revision. Use the corresponding S family for current framing.

File: [images/archive/HIS-11_earlier-school-street.png](../images/archive/HIS-11_earlier-school-street.png)
PDF page: 69

### HIS-12 - Earlier The garden town

Earlier density study before the accepted half-scale revision. Use the corresponding S family for current framing.

File: [images/archive/HIS-12_earlier-the-garden-town.png](../images/archive/HIS-12_earlier-the-garden-town.png)
PDF page: 69

### HIS-13 - Earlier The orchard village

Earlier density study before the accepted half-scale revision. Use the corresponding S family for current framing.

File: [images/archive/HIS-13_earlier-the-orchard-village.png](../images/archive/HIS-13_earlier-the-orchard-village.png)
PDF page: 70

### HIS-14 - Earlier Along the farm lane

Earlier density study before the accepted half-scale revision. Use the corresponding S family for current framing.

File: [images/archive/HIS-14_earlier-along-the-farm-lane.png](../images/archive/HIS-14_earlier-along-the-farm-lane.png)
PDF page: 70

### HIS-15 - Earlier The hamlet square

Earlier density study before the accepted half-scale revision. Use the corresponding S family for current framing.

File: [images/archive/HIS-15_earlier-the-hamlet-square.png](../images/archive/HIS-15_earlier-the-hamlet-square.png)
PDF page: 70

### HIS-16 - Earlier Continuous old town

First large-town pass with larger foreground facades. U01-U05 contain the corrected smaller-scale versions.

File: [images/archive/HIS-16_earlier-continuous-old-town.png](../images/archive/HIS-16_earlier-continuous-old-town.png)
PDF page: 70

### HIS-17 - Earlier Old center and garden streets

First large-town pass with larger foreground facades. U01-U05 contain the corrected smaller-scale versions.

File: [images/archive/HIS-17_earlier-old-center-and-garden-streets.png](../images/archive/HIS-17_earlier-old-center-and-garden-streets.png)
PDF page: 71

### HIS-18 - Earlier Historic and modern infill

First large-town pass with larger foreground facades. U01-U05 contain the corrected smaller-scale versions.

File: [images/archive/HIS-18_earlier-historic-and-modern-infill.png](../images/archive/HIS-18_earlier-historic-and-modern-infill.png)
PDF page: 71

### HIS-19 - Earlier Old quarter and postwar streets

First large-town pass with larger foreground facades. U01-U05 contain the corrected smaller-scale versions.

File: [images/archive/HIS-19_earlier-old-quarter-and-postwar-streets.png](../images/archive/HIS-19_earlier-old-quarter-and-postwar-streets.png)
PDF page: 71

### HIS-20 - Earlier Contemporary town and old core

First large-town pass with larger foreground facades. U01-U05 contain the corrected smaller-scale versions.

File: [images/archive/HIS-20_earlier-contemporary-town-and-old-core.png](../images/archive/HIS-20_earlier-contemporary-town-and-old-core.png)
PDF page: 71
