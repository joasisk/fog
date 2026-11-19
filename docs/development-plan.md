# Development plan

Start with one playable café scene and prove the interaction with real fog motion and spatial sound. Expand it into a two-street prototype, then use the same scene model and asset formats to build varied autumn towns. Source the pilot art and sound alongside the first implementation.

## 1. Set up the browser app

- Add Vite to the existing TypeScript package. Choose a Node.js LTS version and update the npm lockfile. Add `npm run dev`, `npm run build`, and `npm run preview`. Run the existing `npm run typecheck` as part of the production build.
- Set up Canvas 2D with a 16:9 logical scene scaled to the window. Use the same transform for drawing and for converting pointer events into scene coordinates.
- Keep generation, rendering, input, and Web Audio separate around the shared scene model. Assemble the café scene with the town, street, lot, site, building, and use records in `src/model/`.

**Done when** a clean checkout can install with `npm ci`, open the development page, and serve the production build over local HTTP. [Technology](technology.md) · [Data model](data-model.md)

## 2. Make the café scene playable

- Generate a short street on load from a repeatable seed. Include a café with flats above, a shared-wall neighbor, a foreground autumn tree, and a distant hill. Use the first pilot assets or original provisional washes and clips to get the scene running.
- Composite fog between the tree, façades, and hills. Animate it along with fine rain so the café can disappear behind a bank while the nearer tree stays visible.
- Add a continuous stereo rain bed on its own mix group. Place café murmur and the milk-steamer cue at the café door. Adjust their pan, level, and filtering as the pointer or touch drag moves the listener. Enable playback on the first supported gesture.
- Make a click or tap on the café prepare a bookshop that fits the same site and wall contacts. Over roughly five to six seconds, cover the affected area with fog, fade the town sounds down, swap geometry and emitters under cover, and reveal with the bookshop sounds. Keep the rain playing.

**Done when** the built scene opens on a laptop and a phone, the café pans as the listener passes it, and a click or tap triggers a clean reveal. Check that a touch drag moves the listener and a tap selects the building. [User interaction](user-interaction.md) · [Sound engine development plan](sound-engine-plan.md)

## 3. Complete the two-street prototype

- Generate two connected streets with different characters. Start with attached town-center frontage and a residential street with detached homes and a small park. Vary lot widths, façades, and tree placement with the seed.
- Extend click targets to exposed road and sky. A road click rebuilds the selected street and its frontage between the shared junctions. A sky click generates a town from a fresh seed. Use the same cover, replace, and reveal sequence at all three scales.
- Validate street connections, neighboring lot spans, site fit, and shared walls before applying a replacement. Add focused tests for repeatable seeds and the boundaries of each regeneration scope. Exercise the three-lot school site in a generation test.
- Add wet footsteps, an occasional car, and park laughter as emitters on the street or at their sites. Cycle through shuffled takes without immediate repeats when alternatives are available.

**Done when** the scene opens on a complete small town, each of the three clicks changes its intended area, and the rain continues through repeated reveals. A building swap fits its site and a street swap reconnects to its junctions. [Procedural generation](procedural-generation.md) · [Sound inventory](sound-inventory.md)

## 4. Integrate the production assets

Bring in a pilot of the matched café and bookshop, attached and detached houses, one recolorable deciduous tree and one evergreen, and the first sound cues. Check image anchors and transparent edges in the rendered scene. Use those results to settle export sizes and asset metadata. Once the pilot assets work in the app, larger-town generation and catalog production can proceed in parallel.

- **Windows.** Animate light at room level and clip moving silhouettes, curtains, and blinds to the pane masks. Keep the frame in front. Test a room with two panes lighting together and a silhouette crossing between them.
- **Buildings and plants.** Produce the 365 compatible building variants, 300 tree sets, and 84 supporting plant and prop variants in reviewed batches. Check shared wall alignment, site fit, growth-stage silhouettes, and autumn recoloring at scene scale.
- **Sound.** Fill out the environment, street, and building cue groups with original or CC0 recordings. Collect at least three distinct takes per cue when available. Keep creator, source, license, and edit records with the pack. Check the rain loop seam and audition localized voices for indistinct speech.

**Done when** the app can pick compatible art and sound from the catalog, resolve their anchors, and load the files it uses in a scene. Representative windows and recolored trees work through a fog reveal. [Asset generation guide](asset-generation-guide.md) · [Sound inventory](sound-inventory.md)

## 5. Generate larger towns

- Add the five street profiles and their frontage arrangements. Use the same site rules for detached houses, terraced rows, and older attached façades with mixed uses.
- Reserve sites for parks, schools, and bus stops as housing grows. Check walking routes along connected streets and paths. Use adjacent variable-width lots for larger sites and keep required services reachable when regenerating a street.
- Make the generated scene use the catalog for façade shapes, seasonal planting, window activity, and use-specific sounds. Inspect several seeds ranging from a sparse village to a compact town.

**Done when** towns differ in layout and character, attached façades join cleanly, and housing clusters can reach their planned services before and after changes. [Data model](data-model.md) · [Building properties](building-properties.md)

## 6. Prepare the browser release

- Test the production build from a site root and a subpath such as `/fog/`. Verify asset loading, click targeting after resize, touch gestures, and audio startup across desktop and mobile browsers.
- Check repeated regeneration for accumulating canvases or audio sources. Measure draw times and asset download sizes on the test devices, then tune buffer resolution and asset loading where needed.
- Package `dist/` for HTTPS static hosting and document how to run the same build locally. Once the hosted version is stable, add offline revisits by caching a complete release with its required assets.

**Done when** the static release opens from a link, plays and regenerates reliably on the tested browsers, and includes the asset source and license records. [Technology](technology.md)
