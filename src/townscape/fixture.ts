import type { PixelPoint } from "../model/assets.ts";
import { assetPath, requireValue, toPixels } from "./assets.ts";
import type { Side, TownscapeAsset } from "./assets.ts";

const phaseNames = ["rear", "ground", "foundation", "roads", "structures", "props", "lip"] as const;
type Phase = typeof phaseNames[number];
type BandId = "far" | "middle" | "near";

interface SpriteSpec {
  asset: string;
  pivot_px: PixelPoint;
  scale?: number;
  mirror?: boolean;
  opacity?: number;
  layers?: string[];
}

interface ItemSpec extends SpriteSpec {
  id?: string;
  band: BandId;
  phase: Phase;
  route?: string;
  start_node?: string;
  end_node?: string;
  branch_node?: string;
  branch_route?: string;
  split_from?: BandId;
}

interface BuildingSpec {
  id: string;
  asset: string;
  band: BandId;
  shelf: string;
  left_px: number;
  route: string;
  exposed?: Side[];
  foundation?: string;
  alternates?: string[];
  lights?: boolean;
}
interface RoadSpec {
  id: string;
  band: BandId;
  from_id: string;
  to_id: string;
}

interface BandSpec {
  id: BandId;
  scale: number;
  support_profile_px: PixelPoint[];
  shelves: Record<string, { left: number; right: number; baseline: number }>;
}

export interface RawFixture {
  schema_version: number;
  units: string;
  reference_frontage_px: number;
  viewport_px: PixelPoint;
  reduced_viewport_px: PixelPoint;
  backdrop: Record<"sky" | BandId, string>;
  bands: BandSpec[];
  nodes: Record<string, { band: BandId; px: PixelPoint }>;
  edges: (RoadSpec & ({ kind: "stairs" } & SpriteSpec | { kind: "lane"; via_px: PixelPoint[] }))[];
  buildings: BuildingSpec[];
  items: ItemSpec[];
  mist: { after: BandId; duration_s: number; offset_px: number; sheets: SpriteSpec[] }[];
}

export interface Sprite {
  art: TownscapeAsset;
  anchor: PixelPoint;
  /** Display pixels per pixel in the untrimmed source. */
  scale: number;
  mirror: boolean;
  opacity: number;
  layers?: string[];
  exposed?: Side[];
  lights?: boolean;
  alternates?: TownscapeAsset[];
}

interface Road {
  path: PixelPoint[];
  band: BandId;
  kind: RawFixture["edges"][number]["kind"];
}

interface Band {
  id: BandId;
  art: URL;
  terrainRange: readonly [minY: number, maxY: number];
  q: number;
  packets: { [key in Phase]: Sprite[] };
  roads: Road[];
  mist?: { sheets: Sprite[]; seconds: number; drift: number };
}

export interface Hillside {
  size: PixelPoint;
  reducedSize: PixelPoint;
  sky: URL;
  bands: Band[];
  roads: Road[];
  entrances: { path: [PixelPoint, PixelPoint]; width: number }[];
  slot: Sprite;
}

const same = (a: PixelPoint, b: PixelPoint) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.001;
const findClosest = (path: readonly PixelPoint[], point: PixelPoint) => {
  let hit = path[0]!;
  let distance = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const length2 = dx * dx + dy * dy;
    const t = length2 === 0 ? 0 : Math.min(1, Math.max(0, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / length2));
    const p = [a[0] + t * dx, a[1] + t * dy] as const;
    const d = Math.hypot(p[0] - point[0], p[1] - point[1]);
    if (d < distance) {
      distance = d;
      hit = p;
    }
  }
  return { hit, distance };
};

export function projectPoint(sprite: Sprite, source: PixelPoint): PixelPoint {
  const [x, y] = sprite.art.pivotPx;
  return [sprite.anchor[0] + (source[0] - x) * sprite.scale * (sprite.mirror ? -1 : 1),
          sprite.anchor[1] + (source[1] - y) * sprite.scale];
}

const projectUv = (sprite: Sprite, point: PixelPoint) => projectPoint(sprite, toPixels(sprite.art.source_dimensions_px, point));

function joinPoint(sprite: Sprite, name: string) {
  const join = sprite.art.joins?.[name];
  requireValue(join, `${sprite.art.asset_id}: no join called ${name}`);
  return projectUv(sprite, join.uv);
}

function supportHeight(profile: PixelPoint[], x: number) {
  for (let i = 1; i < profile.length; i++) {
    const [a, y0] = profile[i-1]!;
    const [b, y1] = profile[i]!;
    if (x >= a && x <= b) return y0 + (y1 - y0) * (x - a)/(b - a);
  }
  return Infinity;
}

function validateNeighbor(left: Sprite, right: Sprite, context: string) {
  const a = left.art.wall_contacts?.right;
  const b = right.art.wall_contacts?.left;
  requireValue(a && b && a.profile === b.profile &&
    a.span_uv.every((point, i) => same(projectUv(left, point), projectUv(right, b.span_uv[i]!))),
  `${context}: shared contacts do not meet`);
  requireValue(!left.exposed?.includes("right") && !right.exposed?.includes("left"),
    `${context}: exposed end layer intersects a shared wall`);
}

export function resolveHillside(layout: RawFixture, inventory: ReadonlyMap<string, TownscapeAsset>, source: URL): Hillside {
  requireValue(layout?.schema_version === 1 && layout.units === "virtual_pixels" && layout.reference_frontage_px === 72,
    "Hillside: unsupported fixture coordinates or version");
  const size = layout.viewport_px;
  const reducedSize = layout.reduced_viewport_px;
  requireValue(same(size, [1920, 1080]) && same(reducedSize, [960, 540]), "Hillside: invalid viewport pair");
  const path = (name: keyof RawFixture["backdrop"]) => assetPath(layout.backdrop[name], new URL("./", source), ".png");
  requireValue(layout.bands.map((band) => band.id).join("|") === "far|middle|near", "Hillside: invalid depth band order");
  const bands = new Map<BandId, Band>();
  for (const band of layout.bands) {
    const profile = band.support_profile_px;
    requireValue(band.scale > 0 && band.scale <= 1 && profile[0]?.[0] === 0 && profile.at(-1)?.[0] === size[0] &&
      profile.every(([x, y], i) => Number.isFinite(y) && (!i || x > profile[i-1]![0])), `${band.id}: invalid terrain profile`);
    bands.set(band.id, {
      id: band.id, art: path(band.id), q: band.scale, roads: [],
      terrainRange: [Math.min(...profile.map((p) => p[1])), Math.max(...profile.map((p) => p[1]))],
      packets: { rear: [], ground: [], foundation: [], roads: [], structures: [], props: [], lip: [] },
    });
  }
  const getBand = (key: BandId) => {
    const band = bands.get(key);
    requireValue(band, `Unknown band ${key}`);
    return band;
  };
  const getArt = (id: string) => {
    const asset = inventory.get(id);
    requireValue(asset, `Unknown asset ${id}`);
    return asset;
  };
  function place(spec: SpriteSpec, q: number): Sprite {
    const art = getArt(spec.asset);
    const factor = spec.scale ?? q;
    const opacity = spec.opacity ?? 1;
    requireValue(Number.isFinite(factor) && factor > 0 && spec.pivot_px.every(Number.isFinite) &&
      (!spec.mirror || art.can_mirror) && opacity >= 0 && opacity <= 1 &&
      (!spec.layers || spec.layers.every((name) => art.layer_order.includes(name))),
    `Invalid placement for ${spec.asset}`);
    return { art, anchor: spec.pivot_px, scale: factor / art.authored_scale, mirror: spec.mirror ?? false, opacity,
      ...(spec.layers && { layers: spec.layers }) };
  }

  const nodes = layout.nodes;
  const node = (id: string) => {
    requireValue(Object.hasOwn(nodes, id) && nodes[id]?.px.every(Number.isFinite), `Unknown or invalid street node ${id}`);
    return nodes[id]!;
  };
  const adjacency = new Map(Object.keys(nodes).map((id) => [id, [] as string[]]));
  const roads = new Map<string, Road>();
  for (const edge of layout.edges) {
    const band = getBand(edge.band);
    const start = node(edge.from_id);
    const end = node(edge.to_id);
    requireValue(!roads.has(edge.id) && edge.from_id !== edge.to_id, `${edge.id}: duplicate or degenerate edge`);
    let points = [start.px, end.px];
    if (edge.kind === "stairs") {
      const stair = place(edge, band.q);
      requireValue(stair.art.landings_uv?.length === 2 && stair.art.centerline_uv &&
        same(joinPoint(stair, "upper"), start.px) && same(joinPoint(stair, "lower"), end.px), `${edge.id}: stair landings miss route nodes`);
      points = stair.art.centerline_uv.map((point) => projectUv(stair, point));
      band.packets.roads.push(stair);
    } else {
      requireValue(start.band === edge.band && end.band === edge.band && edge.via_px.every((p) => p.every(Number.isFinite)),
        `${edge.id}: lane must stay inside its band`);
      points = [start.px, ...edge.via_px, end.px];
    }
    const road: Road = { path: points, band: band.id, kind: edge.kind };
    adjacency.get(edge.from_id)!.push(edge.to_id);
    adjacency.get(edge.to_id)!.push(edge.from_id);
    band.roads.push(road);
    roads.set(edge.id, road);
  }
  const connected = new Set<string>();
  const pending = [Object.keys(nodes)[0]!];
  while (pending.length) {
    const id = pending.pop()!;
    if (connected.has(id)) continue;
    connected.add(id);
    pending.push(...adjacency.get(id)!);
  }
  requireValue(connected.size === adjacency.size, "Hillside: disconnected walking network");

  function lane(id: string, band: BandId) {
    const road = roads.get(id);
    requireValue(road?.band === band && road.kind === "lane", `${id}: no lane in the ${band} band`);
    return road.path;
  }
  const entrances: Hillside["entrances"] = [];
  function connect(sprite: Sprite, route: string, band: BandId, id: string) {
    const { entrance, entrancePx, ground } = sprite.art;
    requireValue(entrance && entrancePx, `${id}: missing entrance geometry`);
    const q = sprite.scale * sprite.art.authored_scale;
    const width = entrance.clearance_f.width * layout.reference_frontage_px * q;
    const threshold = projectPoint(sprite, entrancePx);
    if (ground) {
      const [left, right] = ground.map((p) => projectPoint(sprite, p)[0]) as [number, number];
      requireValue(threshold[0] - width/2 >= left && threshold[0] + width/2 <= right, `${id}: threshold corridor intersects parcel edge`);
    }
    const nearest = findClosest(lane(route, band), threshold);
    requireValue(nearest.distance <= entrance.clearance_f.depth * layout.reference_frontage_px * q &&
      nearest.hit[1] >= threshold[1] - .001, `${id}: entrance cannot reach ${route}`);
    entrances.push({ path: [threshold, nearest.hit], width });
  }

  const occupied = new Map<string, { id: string; left: number; right: number; sprite: Sprite }[]>();
  const buildingIds = new Set<string>();
  let slot: Sprite | undefined;
  for (const entry of layout.buildings) {
    requireValue(!buildingIds.has(entry.id), `Duplicate site ${entry.id}`);
    buildingIds.add(entry.id);
    const band = getBand(entry.band);
    const definition = layout.bands.find((b) => b.id === band.id)!;
    const shelf = definition.shelves[entry.shelf];
    const art = getArt(entry.asset);
    requireValue(shelf && art.ground && art.family === "shell", `${entry.id}: missing shell or terrain shelf`);
    const q = band.q;
    const right = entry.left_px + art.world_width_f * layout.reference_frontage_px * q;
    const x = entry.left_px + (art.pivotPx[0] - art.ground[0][0]) * q / art.authored_scale;
    const pivot = [x, shelf.baseline] as const;
    const within = [entry.left_px, right, ...definition.support_profile_px.filter(([x]) => x > entry.left_px && x < right).map(([x]) => x)];
    requireValue(entry.left_px >= shelf.left && right <= shelf.right &&
      within.every((x) => supportHeight(definition.support_profile_px, x) <= shelf.baseline), `${entry.id}: unsupported footprint`);
    const alternate = entry.alternates?.map(getArt);
    const sprite: Sprite = { ...place({ asset: entry.asset, pivot_px: pivot }, q),
      ...(entry.exposed && { exposed: entry.exposed }), ...(entry.lights !== undefined && { lights: entry.lights }),
      ...(alternate && { alternates: alternate }) };
    connect(sprite, entry.route, band.id, entry.id);
    const worldGround = art.ground.map((p) => projectPoint(sprite, p));
    const support = entry.foundation ? place({ asset: entry.foundation, pivot_px: pivot }, q) : undefined;
    if (support) {
      const { supported_mode, top_span_uv } = support.art;
      requireValue(supported_mode && top_span_uv && art.foundation_modes?.includes(supported_mode) &&
        top_span_uv.every((point, i) => same(projectUv(support, point), worldGround[i]!)),
      `${entry.id}: foundation does not support the shell's full contact span`);
      band.packets.foundation.push(support);
    } else {
      requireValue(art.foundation_modes?.includes("level_plinth"), `${entry.id}: shell needs a dedicated foundation`);
    }

    if (alternate?.length) {
      requireValue(!slot, "The review fixture requires one interchangeable shop slot");
      slot = sprite;
      for (const variant of alternate) {
        const candidate = { ...sprite, art: variant };
        requireValue(variant.ground && variant.entrancePx && art.entrancePx &&
          variant.ground.every((p, i) => same(projectPoint(candidate, p), worldGround[i]!)) &&
          same(projectPoint(candidate, variant.entrancePx), projectPoint(sprite, art.entrancePx)) &&
          JSON.stringify(variant.entrance?.clearance_f) === JSON.stringify(art.entrance?.clearance_f) &&
          (!support || variant.foundation_modes?.includes(support.art.supported_mode!)),
        `${entry.id}: alternate ${variant.asset_id} does not fit the same site`);
      }
    }
    const parcels = occupied.get(entry.band + "." + entry.shelf) ?? [];
    parcels.push({ id: entry.id, left: entry.left_px, right, sprite });
    occupied.set(entry.band + "." + entry.shelf, parcels);
    band.packets.structures.push(sprite);
  }
  for (const parcels of occupied.values()) {
    parcels.sort((a, b) => a.left - b.left);
    for (let i = 1; i < parcels.length; i++) {
      const left = parcels[i-1]!;
      const right = parcels[i]!;
      requireValue(left.right <= right.left + .001, `${left.id} intersects ${right.id}`);
      if (Math.abs(left.right - right.left) < .001) {
        for (const leftArt of [left.sprite.art, ...left.sprite.alternates ?? []]) {
          for (const rightArt of [right.sprite.art, ...right.sprite.alternates ?? []]) {
            validateNeighbor({ ...left.sprite, art: leftArt }, { ...right.sprite, art: rightArt }, `${left.id} / ${right.id}`);
          }
        }
      }
    }
  }

  for (const item of layout.items) {
    const band = getBand(item.band);
    requireValue(phaseNames.includes(item.phase), `Unknown draw phase ${item.phase}`);
    const sprite = place(item, band.q);
    if (item.route && sprite.art.entrance) connect(sprite, item.route, band.id, item.id ?? item.asset);
    if (item.route && sprite.art.family === "street") {
      const start = joinPoint(sprite, "start");
      const end = joinPoint(sprite, "end");
      const primary = lane(item.route, band.id);
      requireValue(findClosest(primary, start).distance < .01 &&
        band.roads.some((road) => road.kind === "lane" && findClosest(road.path, end).distance < .01),
      `${item.asset}: road art does not meet the contour lane`);
      if (item.start_node) requireValue(same(start, node(item.start_node).px), `${item.asset}: start node mismatch`);
      if (item.end_node) requireValue(same(end, node(item.end_node).px), `${item.asset}: end node mismatch`);
      if (item.branch_node && item.branch_route) {
        const branch = joinPoint(sprite, "branch");
        requireValue(same(branch, node(item.branch_node).px) &&
          findClosest(lane(item.branch_route, band.id), branch).distance < .01, `${item.asset}: junction branch is detached`);
      }
    }
    if (item.split_from) {
      const split = sprite.art.depth_parts;
      const previous = getBand(item.split_from);
      requireValue(split && previous.q < band.q, `${item.asset}: invalid tall-object depth split`);
      previous.packets.lip.push({ ...sprite, layers: split.rear });
      band.packets[item.phase].push({ ...sprite, layers: split.front });
    } else {
      band.packets[item.phase].push(sprite);
    }
  }
  const gapAfter = { far: "far-to-middle", middle: "middle-to-near" } as const;
  for (const mist of layout.mist) {
    const band = getBand(mist.after);
    requireValue(mist.after !== "near" && !band.mist && mist.duration_s > 0 && Number.isFinite(mist.offset_px),
      `Invalid mist gap after ${mist.after}`);
    const sheets = mist.sheets.map((spec) => place(spec, band.q));
    requireValue(sheets.every((sheet) => sheet.art.distribution?.band_gaps.includes(gapAfter[mist.after as "far" | "middle"])),
      `Mist sample does not cover the gap after ${mist.after}`);
    band.mist = { sheets, seconds: mist.duration_s, drift: mist.offset_px };
  }
  requireValue(slot && getBand("far").mist && getBand("middle").mist, "Hillside needs two mist gaps and an interchangeable shop");
  return { size, reducedSize, sky: path("sky"), bands: [...bands.values()], roads: [...roads.values()], entrances, slot };
}
