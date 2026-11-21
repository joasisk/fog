# Townscape world generator plan

Generate in this order **terrain → settlement size → roads → town layout → buildings → resolved scene**. The [art handoff](../Town-Soundscape-Handoff-v1/documentation/Art-and-Generation-Guide.md) describes placing a center before the graph. For this implementation, road routing may target a terrain-derived landing or junction candidate. The district pass assigns the actual center, historic extent and other land uses on the completed graph.

## 1. Terrain

Build a seed-driven height surface h(x,d) from sampled, interpolated profiles on a common world domain. Return support geometry for filled depth bands, slope queries, buildable connected regions, exclusion polygons (water, cliffs, saturated ground), suitable crossings and external approaches. Generate those inputs before selecting settlement size. Start with rolling foothills with buildable benches and a contour lane preset. Follow with the river valley and gorge cases (REF-L01/L06) as explicit crossing tests. The terrain geometry controls the grades, usable lots and positions of structures.

## 2. Settlement size

Measure connected buildable area, usable route corridor length, contiguous public-site opportunities and plausible connections. Use conservative capacity to select a seeded feasible tier, then verify actual capacity from the graph and parcels. A requested tier is accepted if feasible. Return a diagnostic when unsupported, or use a smaller feasible tier when the caller explicitly enables that fallback. Preserve the chosen terrain through retries.

| Tier | Starting visible footprint and route pattern | Public focus |
| --- | --- | --- |
| City | 160–320 buildings, 6–10 bands as a large-town starting range. Multiple linked blocks, through routes, local lanes and districts. | Primary civic center plus secondary local centers where supported. |
| Town | 35–85 buildings over 3–5 bands for a compact old town, or 50–150 over 4–7 for a transition town. Primary spine and connected branches. | A square or civic street, with neighborhood services where needed. |
| Village | 18–40 buildings, 2–4 bands. A main street and short branches with gardens and productive plots. | Small shared center and selective local services. |
| Hamlet | 7–18 buildings, 2–3 bands. A short spine or branch cluster. | One modest gathering place if it fits. |
| Farm lane | 5–10 buildings, 1–2 bands. One connected contour ribbon with spaced parcels. | Shared frontage or working access as appropriate. |
| Farmstead | Proposed 1–4 structures in one band. Farmhouse and optional outbuildings around a working yard with an external lane. | Farmyard and access. |

These are tuning ranges informed by the handoff. Mapping large town to city and adding a farmstead recipe are planning decisions. Keep settlement tier distinct from morphology such as compact core, taper or garden village. Confirm counts at fixed scale and keep rural types viable with very limited road networks.

## 3. Road layout

- Build a routing graph sampled on buildable ground. Connect eligible exits via a contour-following spine, with optional cross-depth connections and local branches based on tier. Penalize steep grades, necessary earthworks and fragmentation. Start with approximately 8° for ordinary lanes, 14° for short steep segments and stairs for suitable steeper links. Tune against the slice.
- Record world centerlines and elevation samples, travel width, surface, route type, level, graph endpoints, path distance and usable frontage spans. Use explicit bridgeheads and stair landings. Projected crossings may be separated by depth or level, with adjacency determined by shared nodes.
- Reject unsupported junctions, self intersections and disconnected road components. A bridge may span a water or gorge exclusion through an approved crossing with supported ends. Keep the narrow apparent paving reveal (initially 0.04–0.12 F in the near view) independent of graph width.
- Use stable edge and junction ordering. Stop searching after configured retry limits. Try another local route or reduce a marginal branch before rejecting a graph. A cul-de-sac or entrance stub can serve a farmstead.

## 4. Town layout on the roads

- Score reachable junctions and frontage clusters by centrality along the walking graph, buildable parcel capacity, slope and relationship to through traffic. Choose the main center or rural equivalent first. For larger settlements, seed historic streets as a contiguous connected subgraph using narrow frontage and block coherence, then assign civic, terraced, garden, modern infill and rural areas from distance, terrain and recipe weights. Represent street profile separately from architectural era and land use.
- For transition layouts, evaluate a common world-space core-to-edge density field across all depth bands, starting near 0.85 at the core and 0.08 at the edge. Couple lower occupancy with fewer shared walls and more garden, orchard and field frontage. Prefer occupation on the main route as branches thin. Maintain the link from last house to the center and exits. Reserve an abrupt edge for compact isolated settlements where the recipe calls for it.
- Parcel usable frontage by arc length on each edge side. Keep junction clearances, rear depth and buildable support. Use one owning frontage for corner entrances. Assign attached, paired or detached envelopes, setbacks, height limits and thresholds. Reserve civic and public parcels, through-route stop locations and school/play yards before filling with housing. Connect every entrance to walkable edges. Measure required park, school and bus access by network distance and capacity for tiers where those services are required. Use handoff plaza and playground reservations by recipe.
- Emit district assignments, frontage sections, lots, grouped sites, public uses and buildable envelopes. Use explicit park/play/plaza/field/yard representations where needed. Preserve the accepted graph when assigning districts and massing, and keep local graph repair bounded and revalidated when necessary.

## 5. Buildings and landscape

Select catalog candidates after uses and envelopes are known. Filter by shell and component compatibility, footprint, frontage, height, wall contacts, setbacks, floor/use requirements, entrance and foundation. Weight eligible designs by district, era and frontage profile. Keep walls vertical. Derive the root, access landing, level plinth or stepped foundation from the terrain and validate support across the footprint. Resolve material, window and prop sockets after shell selection. Use independent sub-seeds per stable site and stage. Retry with a smaller compatible design or another legal foundation, then convert optional parcels to planted/open uses if needed. A failed required venue invalidates that layout unless a reachable alternative is reserved. Validate final dwelling/service counts, with buildings followed by vegetation and props respecting paths, entrances and silhouette clearance.

## 6. Resolved scene and integration

Keep the generator pure TypeScript and browser-independent under `src/generation/`. Keep logical coordinates x, d and h separate from the existing screen-oriented `ScenePosition`. Project once using `screenX = cx + (x - cameraX) * F * q(d)` and `screenY = baseline(d) - h * F * q(d)`, starting with depth scales 1, 0.88, 0.76, 0.64, 0.53 and 0.43. Keep world distances and heights available for validation. Preserve the existing normalized depth and viewport conventions at the adapter boundary.

Reuse `Scene`, `Town`, `StreetNetwork`, `Lot`, `Site` and `Building` for the application-facing result. Extend the two-value `SettlementKind` in `src/model/scene.ts` compatibly. Introduce the minimum world-space terrain and route details needed for the slice. Adapters should preserve the existing pilot and its catalog while the new generator is brought through the normal `src/pilot/main.ts` entry point. Use a versioned recipe and resolved snapshot with stable IDs. Derive streams by seed, stage and entity so weather and embellishment leave geometry stable. Use the [scene recipe example](../Town-Soundscape-Handoff-v1/examples/scene-recipe.example.json) as a reference for tunables.

Resolve ordered draw packets by logical band, local depth and explicit occlusion dependencies. Within each band compose supporting land, rear plants, ground and paving, structures, attached and ground props, foreground lips/foliage, then a mist gap before the next nearer band. Split tall objects and bridge parts where required. Keep hit regions and sound emitters tied to the resolved layout and exposed foreground priority. Generate and validate town replacements before the fog swap. Street replacements must respect retained external junctions, and building replacements must fit the existing site, service and shared edges. Retain the last valid scene on failure and preserve continuous rain during transitions.

## Shared asset contract

Use the handoff [asset manifest example](../Town-Soundscape-Handoff-v1/examples/asset-manifest.example.json) as authoring input. Agree a small, versioned slice schema before batch 2. Require stable IDs, family/style/use tags, footprint and size in F, source dimensions and trim, normalized UV pivots and sockets, ground/span and entrance data, and supported wall contacts and foundation modes. Components declare compatible sockets, exclusions, layer/mask files and available wet/lit states. Street and ground entries declare joins, slopes and support modes. Mist entries declare density/falloff assets and band coverage. Record room/pane IDs for window behavior and semantic anchors for picking and sound.

Normalize authoring UVs against the untrimmed frame at import, converting to the pixel-frame conventions in `src/model/assets.ts` and `src/pilot/building-catalog.ts`. Preserve trim rectangles and convert world F to projected units only at placement. Reuse existing asset IDs through explicit mappings where needed. Resolve paths relative to the manifest and support Vite subpath deployment. Reject invalid required footprints, pivots, joins or entrance metadata with actionable diagnostics. Allow optional layers or props to be omitted. Give the developer representative fixture entries for attached, detached, stepped and civic envelopes so geometry work can start while art is authored.

## Implementation and verification

| Milestone | Deliverable and checks |
| --- | --- |
| A. Geometry slice | Terrain, tier selection and connected graph with deterministic debug views for profiles, exclusions, grades and routes. Begin with a foothill town and contour farm lane. Test the stages and repeatability with fixed seeds. |
| B. Parcels and massing | District labels, core-to-edge taper, public lots, and fixture buildings in three bands. Check entrances from graph nodes, limits, overlaps, adjacency, support and public reservations. Add smoke coverage for all six tiers and a constrained terrain case. Compare a front and rear taper band against REF-T01/T03. |
| C. Runtime integration | Load the slice assets and exercise the generated scene through the existing pilot entry point. Review debug overlays and compare rendered framing, narrow streets and terrain support at both viewport sizes. Check mist occlusion, hit priority, audio positions and each replacement scope. |
| D. Expanded coverage | Add terrain presets and review a multi-level crossing from REF-L01/L06, dense infill from REF-U03, and rural scale from REF-S09/L10. Measure generation time, texture use and overdraw on representative devices before tuning counts. |

Run `npm test` and `npm run build` for implementation changes, plus a browser pass for scene entry points, asset loading and regeneration. Regression tests should cover seed stability, explicit crossing semantics, feasible tier selection, local failure, graph reachability, supported footprints and fog-safe replacements.

## Milestone A usage

Import `generateWorldGeometry` and the fixed `GEOMETRY_CASES` from [src/generation/index.ts](../src/generation/index.ts). A successful v1 snapshot has a sampled terrain, selected tier, preliminary terrain capacity, capacity measured on the accepted roads, and the world-space graph. Use stable junction and segment IDs to attach districts and frontage allocations in later passes. Counts are fixture-based estimates until parcels are laid out. Set `requestedTier` for a specific tier and `allowSmallerTier` to opt into fallback. Rejections include stage-specific shortfalls and retain the terrain for inspection.

Both fixed cases use supported ground lanes with grades up to 8°. Routing and the grade view use the steepest slope along each grid link on the interpolated terrain. The foothill town supports three routing benches connected by cross-depth links. The contour farm lane follows the seeded bend of a single shelf between its two exits. Their crossing lists are empty. Bridge and stair routing will be exercised by the later crossing presets.

The geometry and art tools can use the same four fixture entries. Geometry looks them up by envelope name in `GEOMETRY_FIXTURES.assets`. Serialize `GEOMETRY_FIXTURE_MANIFEST` for the handoff's v1 asset-list format, including footprint dimensions, source frames, and entrance UVs. [Geometry fixtures](../src/generation/fixtures.ts)

Use Node to render any of the deterministic SVG views. The initial geometry cases are `foothillTown` and `contourFarmLane`. The geometry views are `terrain`, `exclusions`, `grades`, and `connectivity`.

```sh
node --experimental-transform-types scripts/debug-world-geometry.mjs foothillTown connectivity > /tmp/foothill-roads.svg
node --experimental-transform-types scripts/debug-world-geometry.mjs contourFarmLane terrain > /tmp/contour-terrain.svg
```

## Milestone B usage

`generateWorldLayout(recipe)` runs the geometry and settlement passes and returns a versioned snapshot. On success, `layout` contains the primary and secondary centers, district sections, frontage intervals, lots, grouped sites, fixture buildings and service assignments. To work directly on an accepted or deserialized geometry snapshot, call `layoutOnRoads(world)`. Both entry points use world-space F and walking distances measured from each edge's `from` junction. [Generator entry points](../src/generation/index.ts)

Centers occupy supported public frontage. The historic quarter grows through adjoining sections of the accepted walking graph. A section has a street profile and architectural era, while each lot records its own use. The optional `morphology` setting accepts `transition`, `compact`, `garden` or `rural`. The three-band town defaults to a left-to-right transition. Occupancy, lot width and eligibility for shared walls use the same lateral density field in every band.

The parcel pass reserves the square or working yard, service sites and linked playground before allocating housing frontage. Each straight frontage run ends at a bend or junction clearance. Lots and their envelopes must fit on buildable terrain and clear paving and other lots. The massing pass fits the Batch 1 shells and reserved envelopes, records the door's road address, and extends plinths from ground support to a level floor. Buildings record reciprocal shared walls only where the built edges coincide. [Batch 1 calibration](../assets/townscape/batch-01/calibration.v1.json) · [Shell manifest](../assets/townscape/batch-01/manifest.v1.json)

The slice counts one household per fixture home. Villages reserve a park and a stop on the through route. Towns also reserve a school with an adjoining playground. Cities reserve two sets of services and a secondary square. The initial door-to-gate walking limits are 48 F for villages and towns and 56 F for cities. Each facility serves up to 40, 85 or 180 households respectively. Sites outside service coverage can become planted lots. If the supported building count, service capacity or required reservations fall short, the layout stage returns a diagnostic. Explicit tier fallback reuses the terrain.

| Fixed case | Lots | Buildings | Inhabited bands |
| --- | ---: | ---: | ---: |
| Foothill town, seed 7419 | 67 | 40 | 3 |
| Contour farm lane, seed 9106 | 16 | 5 | 1 |
| Broad foothill city, seed 1609 | 250 | 218 | 6 |

The broad foothills preset provides six benches for the city check and connects branches at two locations to form blocks. Terrain selection is independent of tier selection.

Use the `districts`, `parcels` and `massing` views to inspect the new passes. The massing diagram draws every band at the same lateral scale. In the fixed town, the front band has seven buildings left of world x = 0 and four to its right. The rear band has fifteen and two. Shared-wall buildings decrease from five to two in front and from fifteen to zero in back. This reproduces the shift from rows to detached homes and open land visible in the foothill and garden-home references. [REF-T01](../Town-Soundscape-Handoff-v1/images/current/REF-T01_town-across-the-foothills.png) · [REF-T03](../Town-Soundscape-Handoff-v1/images/current/REF-T03_old-core-to-newer-garden-homes.png)

```sh
node --experimental-transform-types scripts/debug-world-geometry.mjs foothillTown massing > /tmp/foothill-massing.svg
node --experimental-transform-types scripts/debug-world-geometry.mjs broadFoothillCity parcels > /tmp/city-parcels.svg
```

## Milestone C pilot usage

Open the pilot and choose **Foothill town**. Use `?mode=foothill&seed=7419` for the storefront with one shared wall and an exposed end, or `?mode=foothill&seed=7430` for the storefront with two shared walls. `?mode=foothill&seed=7431` opens the third review town. The seed is part of the relative URL, so these links work under a deployment subpath. **Market Lane** opens the original pilot and **Hillside preview** opens the fixed Batch 2 reference.

Use the storefront, street and town buttons or click the exposed storefront, a visible lane or open sky. The storefront swap retains its threshold, foundation and wall contacts. The street swap replaces its surface and selects new compatible shell treatments along the selected edge on the retained graph. The town button cycles through the three review seeds. Each candidate is fitted and prepared before the fog covers the scene. The rain bed runs continuously when sound is enabled.

Use the resolution, mist and overlay controls to compare the generated profiles, exclusions, road grades and walking connections with the fixed hillside. The pilot uses the accepted foothill terrain and layout, with three projected depth bands and Batch 2 art. The accepted foothill graph provides graded lanes between benches. Stair and bridge graph presets remain part of the later terrain coverage.
