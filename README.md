# Fog

Fog is a procedural environmental experience set in a European village or town on a rainy autumn day. Its goal is to make a generated place feel lived in through animated watercolor, the sounds of everyday life, and fog rolling between buildings, trees, and hills.

A complete town takes shape as the scene loads. From a fixed, side-on 2D view, you can watch the weather and listen your way along the street by moving the cursor. A single click asks the generator for a new building, street, or town. Fog rolls in to cover the change, then slowly clears as the sounds of the place return. Soft rain plays throughout.

## Run the two-street prototype

Use Node.js 24 LTS. Run `npm ci` and `npm run dev`, then open the address Vite prints. Click **Enable sound** or interact with the scene to start audio. Move the mouse or drag to listen along the street. Select a building to change it under fog, an exposed road to rebuild its frontage, or open sky to seed a new town. With the scene focused, the arrow keys move the listening position. Enter changes the shop, S rebuilds Market Lane, and T generates a new town.

Run `npm test` for the seeded generation and regeneration checks. Run `npm run build` to type-check and produce `dist/`, and `npm run preview` to serve the built prototype locally. The prototype uses original provisional canvas artwork and synthesized cues. Regenerate the WAV files with `python3 scripts/generate-pilot-audio.py`.

## Design documents

- [Development plan](docs/development-plan.md)
- [Procedural generation](docs/procedural-generation.md)
- [Data model](docs/data-model.md)
- [Visual styling](docs/visual-styling.md)
- [Asset generation guide](docs/asset-generation-guide.md)
- [Soundscape and sound engine](docs/soundscape-and-sound-engine.md)
- [Sound inventory](docs/sound-inventory.md)
- [Building properties](docs/building-properties.md)
- [User interaction](docs/user-interaction.md)
- [Technology](docs/technology.md)
