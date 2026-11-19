# User interaction

Open on a generated town with rain and fog already moving through the scene. The cursor acts as a listening position along the street. As it travels past a building, the building's sounds move through the stereo field and change in level.

## Single clicks

The scene itself provides the controls. A click chooses the scale of a change, and the generator chooses the new layout or building.

| Click target | Result |
| --- | --- |
| Building | Regenerate the building on that lot, including its uses and sound emitters. |
| Road | Regenerate the street and all buildings that front it, connecting the new street to its existing junctions. |
| Sky | Generate a new town and landscape. |

Read click targets from the scene geometry beneath the weather layers. A click on a visible building takes the building's scope, a click on exposed road takes the street's scope, and a click on open sky takes the town's scope.

## Regeneration sequence

1. **Cover.** Roll a fog bank into the selected area and fade all town sounds down until only the soft rain is audible.
2. **Replace.** Once the area is fully covered and a valid replacement is ready, swap its scenery, click targets, and sound sources together.
3. **Reveal.** Let the fog slowly roll out while town sounds fade up around the current listening position.

Start with roughly five to six seconds for a building reveal. Give street and town reveals longer so the fog has time to travel across the affected area. Let each transition finish before accepting another regeneration click. Cursor movement continues to update the listening position during the transition.

## First prototype

Use two short, connected streets with homes, a café with flats above, and a small park. Include a compatible bookshop building for a café lot. The prototype should make these moments easy to verify.

- The scene opens on an inhabited autumn town, with fog visibly moving between near trees, buildings, and farther hills.
- Moving the cursor past the café carries its chatter across the stereo field, while the park's sounds become more audible near the park.
- Clicking the café reveals another building on its lot and fades in the corresponding sounds.
- Clicking the road redraws its frontage, while clicking the sky produces a different town and landscape.
- Each click yields a slow fog reveal with uninterrupted soft rain through cover, replacement, and return of the local ambience.

- [Procedural generation](procedural-generation.md)
- [Visual styling](visual-styling.md)
- [Soundscape and sound engine](soundscape-and-sound-engine.md)
