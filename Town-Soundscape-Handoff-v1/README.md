# Town soundscape handoff v1.0

Prepared 21 November 2026.

Start with [01_Town-Soundscape-Art-and-Generation-Guide.pdf](01_Town-Soundscape-Art-and-Generation-Guide.pdf). It combines the production proposal, diagrams, current reference plates and an appendix of earlier studies into one PDF.

## Package contents

- The single PDF is the main designer and developer handoff.
- documentation/Art-and-Generation-Guide.md is its editable text counterpart. The PDF contains the rendered schematics and image catalogues.
- documentation/reference-index.csv and reference-index.json map every reference ID to its filename, PDF page, status, description, developer note, dimensions and SHA-256 checksum.
- documentation/asset-budget.csv lists proposed component counts for planning asset creation.
- images/current/ contains 30 current reference PNGs, with REF-S, REF-U, REF-T and REF-L IDs.
- images/archive/ contains 20 retained iterations, with HIS IDs.
- examples/ contains two JSON documentation examples for the future production asset and scene contracts.

## Reference families

- REF-S01-S10: smaller settlements, hamlets and farm lanes at the accepted wider framing.
- REF-U01-U05: large towns and mixed historic/modern architecture. REF-U02 is a dense town with garden districts; it does not govern taper.
- REF-T01-T05: the five connected tapering-town studies.
- REF-L01-L10: ten different terrain settings, with settlements ranging down to a farm lane.
- HIS-01-HIS-20: earlier iterations preserved for context. Their scale and road layouts can differ from the current direction.

All 50 PNG files retain their original bytes and original full resolution. No delivered PNG has been resized or recolored. PDF previews are compressed for reading. The reference IDs printed in the PDF match the filenames exactly.

## Production status

These are flattened concept references. The package describes how another designer should author the separate terrain, architecture, prop, mask and weather assets. It does not contain finished production sprites, a procedural generator or an implemented mist effect.

The proposed 60-shell building library, component counts, generation settings and mist ranges are starting points for a vertical slice. They have not been benchmarked in an engine. Rolling inter-layer mist is a documented production extension, rather than a new painted study.

Keep this folder structure when using the relative image links in the Markdown guide. Use the reference index to locate a painting by ID or by PDF page.
