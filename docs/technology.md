# Technology

Fog targets desktop and mobile browsers. Town generation, drawing, and audio run on the visitor's device. A release consists of static files that can be served locally or shared as a link.

## Local development

Use TypeScript for the app and Vite for the development server and production build. Use Node.js LTS and npm for development, and commit the lockfile with the app scaffold so contributors can install the same dependency versions.

Once the scaffold is in place, run these commands from the repository root.

| Task | Command |
| --- | --- |
| Install from the lockfile | `npm ci` |
| Start the local development server | `npm run dev` |
| Build the static release into `dist/` | `npm run build` |
| Serve the release locally for testing | `npm run preview` |

## Scene model and rendering

Keep the seeded generator in plain TypeScript so a layout can be reproduced and checked without opening a browser. It produces a shared scene model with terrain, streets, lots, sites, and buildings with their uses. A building's geometry gives the renderer a silhouette and the input handler a click target. Its uses supply the sound engine with emitter positions and profiles.

Use Canvas 2D to composite the painted layers. Cache hills, buildings, and trees in reusable canvases. Animate translucent fog between the cached layers and draw rain over the scene. Drive movement and reveal timing by elapsed time so the animation keeps its pace at different frame rates. Size the drawing buffers to suit the display and cap their resolution if profiling on phones shows a need.

Prepare the replacement within the selected scope. Once fog covers the affected area and the town audio is silent, swap in the generated geometry, click targets, and sound emitters together. Refresh the affected drawing caches before the reveal.

- [Data model](data-model.md)
- [Procedural generation](procedural-generation.md)
- [Visual styling](visual-styling.md)

## Pointer and touch

Use Pointer Events to map input into the same scene coordinates the renderer uses. On desktop, moving the pointer shifts the listening position and a click regenerates its target. On touchscreens, a drag moves the listener and a tap regenerates its target. Use the distance traveled during a touch gesture to distinguish a tap from a drag.

Generate and animate the town on load. Create or resume the Web Audio context from the first click or tap handler when the browser requires a gesture for playback. The same gesture can also trigger the usual regeneration.

- [User interaction](user-interaction.md)

## Audio

Use the Web Audio API to mix the scene in stereo. Decode and reuse the audio buffers for a looping rain bed and intermittent town sounds. For each local emitter, adjust level with a gain node, muffle distant or indoor sounds with a low-pass filter, and pan according to the emitter's position relative to the listener. Ramp these values as the listener moves.

Route the rain bed and town ambience through separate gain nodes. During regeneration, fade the town group down with the incoming fog, update its emitters while the group is silent, then fade it up as the fog clears. Leave the rain loop playing through all three phases.

- [Soundscape and sound engine](soundscape-and-sound-engine.md)

## Art and sound assets

Use Krita to paint reusable watercolor textures and silhouettes. Use Audacity to trim loops and prepare ambience clips. Keep editable sources and export compressed assets for the browser. Use original assets or CC0 material and record the source and license of any third-party material included in the build.

## Distribution

Serve `dist/` over HTTP during local testing and over HTTPS for a shared release. Configure Vite with a relative base and use build-resolved asset URLs so the same output can be served from a site root or a path such as `/fog/`. GitHub Pages can host the build for free from a public repository. [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

Add offline revisits later with a service worker that caches a complete release, including its required art and audio, after a successful first visit.

## First technical test

Build a small scene with a café under flats, a foreground tree, and a distant hill. Move past the café and listen for its sound to travel through the stereo field. Click or tap it to reveal a bookshop through the fog. Check that the café sounds fade out, the rain plays continuously, and the bookshop appears with its own ambience as the fog clears. Test the built release on a laptop and a phone before applying the same transition to streets and whole towns in the two-street prototype.
