# Building properties

A building occupies a lot and has one or more uses. Those uses help the generator decide what the town needs and give the sound engine places to play local activity. A café with flats above supplies street-level café sounds and adds residential demand from the flats.

## Lot and building

| Part | Properties | Purpose |
| --- | --- | --- |
| Lot | Location, ground level, street frontage, entrance connection, and buildable envelope | Defines what can fit and which street owns the site for regeneration. |
| Building | Footprint, height, floors, façade and roof design, and depth in the view | Defines the visible silhouette and where it sits among trees, hills, and fog. |
| Use | Category, floor or part of the lot it occupies, and dwelling count or service capacity where relevant | Lets a site contribute housing or a local service and choose fitting activity. |
| Sound emitter | Associated use, position, depth, indoor or outdoor placement, and sound profile | Gives the mixer a location and a set of possible sounds, with different treatment for interior and exterior sources. |

Keep the lot associated with its street when generating an individual replacement. Assign the new building a compatible footprint, uses, and emitters together so its visual identity and audible activity match.

## Uses and combinations

- **Residential.** A house or a set of flats contributes an estimated number of households. The count helps determine demand for parks, schools, and transit.
- **Commercial and office.** A café, restaurant, or bookshop can face the pavement, with flats or offices on upper floors. Place the activity of each use where it would reach the street.
- **Civic.** Schools serve nearby homes. A library or church can meet the street at a square or on a central approach. Their shapes and sound profiles help each place read as a distinct site.
- **Public space and transit.** A park or bus stop uses the same site information for access, service coverage, and sound. Its use belongs to the site itself.

Compatible replacements can change the use mix as well as the shape. A café with flats above can give way to a bookshop with flats. A lot that supplies the only school reachable from a residential cluster can take another school design so it continues to serve those homes.

- [Procedural generation](procedural-generation.md)
- [Soundscape and sound engine](soundscape-and-sound-engine.md)
