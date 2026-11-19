# Soundscape and sound engine

A soft stereo rain bed fills the scene. Around it, quiet sounds suggest that people are going about their day. Wet footsteps come and go, a rare car passes on the road, and conversation drifts out of doorways as indistinct murmurs. Leave irregular stretches where the rain is the clearest sound.

## Sound by place

Each use can provide one or more sound emitters. Place them where the sound would come from, such as a café entrance, a schoolyard, or a church tower. A building with several uses can have emitters on different floors or sides.

| Use | Local sounds |
| --- | --- |
| House or flats | A door opening, wet footsteps near an entrance, a faint murmur through a window |
| Office | Quiet adult voices and occasional movement near a doorway |
| Café | Adult chatter and a laugh, with the short hiss of a milk steamer |
| Restaurant | Low conversation and a brief clink of plates or cutlery |
| Bookshop or library | A door or chair moving between long quiet stretches |
| Park | Intermittent children's laughter and joyful calls |
| School | A muffled cluster of children's voices behind windows or across a yard |
| Church | An occasional bell toll, choral chant, or organ passage |
| Bus stop | Footsteps on the pavement and, when a bus arrives, a brief hiss of brakes |

Keep the cadence and tone of speech audible, with words blurred into a murmur. Give passing cars and footsteps moving positions along the street. Schedule local events with enough space between them for a listener to pick out where they came from.

## Listening position and mix

Map the cursor's horizontal position to a point along the visible street and ease the listener toward it. Pan each source according to its horizontal position relative to that point. Lower its gain with distance, taking scene depth into account. Soften high frequencies for distant sounds and sounds coming through walls. Smooth changes to pan, gain, and filtering as the cursor moves.

Approaching a café from the left should bring its sound up on the right. It moves to the center as you draw level with the entrance, then fades to the left as you pass. A deeper source behind the café should sound farther away from the same listening position.

## Regeneration

Route the continuous soft rain and the rest of the town ambience through separate mix groups. When any regeneration starts, fade the town group toward silence as the fog thickens. Keep the rain bed running through cover and reveal.

Update the affected emitters while the fog hides the replacement and the town group is silent. Fade the resulting ambience back in as the fog clears, using the cursor's current listening position for every source.

- [Building properties](building-properties.md)
- [Sound engine development plan](sound-engine-plan.md)
- [Sound inventory](sound-inventory.md)
- [User interaction](user-interaction.md)
