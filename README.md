# Fog

Fog is a procedural environmental experience set in a European village or town on a rainy autumn day. Its goal is to make a generated place feel lived in through animated watercolor, the sounds of everyday life, and fog rolling between buildings, trees, and hills.

A complete town takes shape as the scene loads. From a fixed, side-on 2D view, you can watch the weather and listen your way along the street by moving the cursor. A single click asks the generator for a new building, street, or town. Fog rolls in to cover the change, then slowly clears as the sounds of the place return. Soft rain plays throughout.

## Run the two-street prototype

Use Node.js 24 LTS. Run `npm ci` and `npm run dev`, then open the address Vite prints. Click **Enable sound** or interact with the scene to start audio. Move the mouse or drag to listen along the street. Select a building to change it under fog, an exposed road to rebuild its frontage, or open sky to seed a new town. With the scene focused, the arrow keys move the listening position. Enter changes the shop, S rebuilds Market Lane, and T generates a new town.

Run `npm test` for the seeded generation and regeneration checks. Run `npm run build` to type-check and produce `dist/`, and `npm run preview` to serve the built prototype locally. Open **Sound settings** beneath the scene to adjust ambient sound and individual building types. Levels are saved in your browser.

When present, `assets/audio/manifest.json` and its local recordings are included by Vite. The app uses original synthesized cues where the local manifest has no matching take. Regenerate the provisional WAV files with `python3 scripts/generate-pilot-audio.py`.

## Development

- [Development plan](docs/development-plan.md)
- [Agent development guidelines](AGENTS.md)

## Design documents

- [Procedural generation](docs/procedural-generation.md)
- [Data model](docs/data-model.md)
- [Visual styling](docs/visual-styling.md)
- [Asset generation guide](docs/asset-generation-guide.md)
- [Soundscape and sound engine](docs/soundscape-and-sound-engine.md)
- [Sound engine development plan](docs/sound-engine-plan.md)
- [Sound inventory](docs/sound-inventory.md)
- [Building properties](docs/building-properties.md)
- [User interaction](docs/user-interaction.md)
- [Technology](docs/technology.md)

## Asset kits

- Weather textures, editable sources, and an animated street preview. [Environmental asset pilot](assets/environment/README.md)
- Street materials, wear overlays, and compositing examples. [Surface asset kit](assets/surfaces/README.md)
