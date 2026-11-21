# Procedural generation

The generator creates a complete town on load. Each town needs a coherent layout at the scale of the whole settlement and enough variation in terrain, frontage, building use, and vegetation to give it a character of its own.

The [townscape world generator plan](townscape-world-generator-plan.md) governs the new implementation. It specifies terrain first, followed by settlement size, roads, districts and parcels, then buildings. The outline below describes the earlier prototype design.

## Lay out the town

1. **Shape the terrain.** Choose the size of the settlement, the profile of the hills, and ground suitable for streets and buildings. Use the slopes and hollows to guide where the town gathers and where trees fill the gaps.
2. **Connect the streets.** Give the settlement a main street or square and a through route for traffic. Connect homes to the center and public spaces with streets and footpaths.
3. **Divide the frontage into lots.** Give each street a role and choose where buildings share walls or stand apart. Divide that frontage into lots of varying widths. A corner lot belongs to the street its main entrance faces.
4. **Plan uses and reserve service sites.** Estimate how many households the frontage can hold, including flats over shops. Group neighboring lots for larger buildings and set aside suitable sites for parks, schools, and stops.
5. **Choose buildings and vegetation.** Draw from designs and use combinations that fit their sites. Place individual trees and wooded patches along streets, in parks, and on the slopes. Give the renderer and sound engine the positions and depth of the generated places.

## Make the layout feel inhabited

Use a compact European main street as the starting pattern for a town center. Narrow frontages and attached buildings can hold cafés, shops, and restaurants at pavement level, with flats or offices above. A church or library can sit near the square. Farther from the center, smaller groups of homes open onto gardens and trees.

As housing clusters grow, plan for a park, a school, and a bus stop reachable on foot. Find park and school sites along connected residential streets. Put stops on the through route near homes or destinations that draw foot traffic. Measure access along the street and path network, since a nearby site across an unconnected slope may be a long walk. Check service access again once the final mix of dwellings and uses is known.

## Generate a replacement

| Scope | What the generator considers |
| --- | --- |
| Building | Choose a new building and use mix within the site's combined lot span, height limits, and shared-wall requirements. Connect its entrance to the street. If the site supplies a required service, select a replacement that fulfills that role. |
| Street | Generate a new road and its frontage at the existing junctions. Divide the frontage into lots, group them into sites, and rebuild the buildings. Check walking routes and service access for the households it serves. |
| Town | Generate new terrain, streets, buildings, public spaces, and vegetation. The new layout supplies its own sound sources. |

Prepare a valid replacement before committing the change. Check for overlapping footprints, disconnected entrances or streets, and gaps in the required services. If the generator exhausts the available options, clear the fog over the current scene and restore its ambience. Seed the generator so a starting town and a sequence of changes can be reproduced during development.

- [Data model](data-model.md)
- [Building properties](building-properties.md)
- [User interaction](user-interaction.md)
