# Building properties

A building occupies a site made up of one or more neighboring lots and has one or more uses. Those uses help the generator decide what the town needs and give the sound engine places to play local activity. A café with flats above supplies street-level café sounds and adds residential demand from the flats.

## Lots, sites, and buildings

| Part | Properties | Purpose |
| --- | --- | --- |
| Lot | Frontage section and distance interval along the street segment | Defines one variable-width piece of frontage. |
| Site | Neighboring lot references, entrance, setback, and building limits | Defines the area and shared-wall boundaries a building must fit. |
| Building | Site reference, footprint, height, floors, and façade and roof design | Defines the visible silhouette and how it fits the site. |
| Use | Category, floor or part of the site it occupies, and dwelling count or service capacity where relevant | Lets a site contribute housing or a local service and choose fitting activity. |
| Sound emitter | Associated use, position, depth, indoor or outdoor placement, and sound profile | Gives the mixer a location and a set of possible sounds, with different treatment for interior and exterior sources. |

Generate an individual replacement within the assigned site. Fit its frontage and shared-wall boundaries, then assign the new building its uses and emitters together so its visual identity and audible activity match.

## Uses and combinations

- **Residential.** A house or a set of flats contributes an estimated number of households. The count helps determine demand for parks, schools, and transit.
- **Commercial and office.** A café, restaurant, or bookshop can face the pavement, with flats or offices on upper floors. Place the activity of each use where it would reach the street.
- **Civic.** Schools serve nearby homes. A library or church can meet the street at a square or on a central approach. Their shapes and sound profiles help each place read as a distinct site.
- **Public space and transit.** A park or bus stop uses the same site information for access, service coverage, and sound. Its use belongs to the site itself.

Compatible replacements can change the use mix as well as the shape. A café with flats above can give way to a bookshop with flats. A site that supplies the only school reachable from a residential cluster can take another school design so it continues to serve those homes.

- [Data model](data-model.md)
- [Procedural generation](procedural-generation.md)
- [Soundscape and sound engine](soundscape-and-sound-engine.md)
