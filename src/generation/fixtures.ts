// Geometry-only entries in the handoff's v1 authoring units. UVs use the untrimmed frame.
const envelope = (asset_id: string, style_family: string, use: string, width: number,
  depth: number, height: number, wall_contacts: readonly string[], foundation_modes: readonly string[]) => ({
  asset_id,
  version: 1,
  family: "building_shell",
  style_family,
  tags: [use, ...wall_contacts],
  semantic_tags: [use],
  world_width_f: width,
  world_height_f: height,
  footprint_f: [[-width / 2, 0], [width / 2, 0], [width / 2, depth], [-width / 2, depth]],
  reference_frontage_px: 72,
  source_dimensions_px: [192, 224],
  trim_rect_px: [24, 8, 144, 208],
  pivot_uv: [0.5, 0.95],
  sockets: { entrance: { uv: [0.5, 0.95], accepts: [use + "_door"] } },
  required_clearance: ["entrance_corridor"],
  wall_contacts,
  foundation_modes,
} as const);

export const GEOMETRY_FIXTURES = {
  schema_version: 1,
  units: {
    world: "frontage_units", source_anchors: "normalized_uv_top_left_y_down",
    world_axes: { x: "along_panorama", d: "away_from_viewer", h: "up" },
  },
  assets: {
    attached: envelope("fixture_attached", "historic_plaster", "residential", 0.9, 0.85, 1.45,
      ["left", "right"], ["level_plinth"]),
    detached: envelope("fixture_detached", "vernacular", "residential", 1.2, 1.25, 1.4,
      [], ["level_plinth"]),
    stepped: envelope("fixture_stepped", "vernacular", "residential", 1.1, 1.0, 1.5,
      [], ["stepped_plinth"]),
    civic: envelope("fixture_civic", "historic_plaster", "civic", 2.5, 1.6, 2,
      [], ["level_plinth"]),
  },
} as const;
