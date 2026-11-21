import type { PixelPoint, PixelRect } from "../model/assets.ts";

export type Side = "left" | "right";

interface RawAsset {
  asset_id: string;
  family: string;
  style_family: string;
  shell_group?: string;
  authored_scale: number;
  source_dimensions_px: PixelPoint;
  trim_rect_px: PixelRect;
  pivot_uv: PixelPoint;
  world_width_f: number;
  world_height_f: number;
  footprint_f?: PixelPoint[] | null;
  ground_span_uv?: [PixelPoint, PixelPoint];
  entrance?: {
    threshold_uv: PixelPoint;
    clearance_f: { width: number; depth: number };
    mask?: string;
  };
  wall_contacts?: Partial<Record<Side, { profile: string; span_uv: [PixelPoint, PixelPoint]; exposed_end_layer?: string }>>;
  foundation_modes?: string[];
  supported_mode?: string;
  top_span_uv?: [PixelPoint, PixelPoint];
  joins?: Record<string, { uv: PixelPoint; profile: string }>;
  centerline_uv?: PixelPoint[];
  landings_uv?: [PixelPoint, PixelPoint][];
  allowed_slope_deg?: [number, number];
  sockets?: Record<string, { uv: PixelPoint; accepts: string[]; excludes?: string[] }>;
  accepts_sockets?: string[];
  excludes?: string[];
  mounts?: { asset: string; socket: string; scale: number; light_group?: string }[];
  semantic_anchors?: { pick_uv: PixelPoint; sound_uv: PixelPoint };
  can_mirror: boolean;
  depth_parts?: { rear: string[]; front: string[] };
  layer_order: string[];
  states: string[];
  files: Record<string, string>;
  overlay_before?: { light?: string };
  rooms?: {
    room_id: string;
    backing: string;
    frame: string;
    pane_order: string[];
    panes: Record<string, { glass: string; clip_mask: string; bounds_uv: PixelRect }>;
    unlit_overlay: string;
    unlit_before: string;
    motion: { frames: string[]; frame_duration_ms: number; loop: boolean } | null;
  }[];
  distribution?: { density: string; falloff: string; noise: string; band_gaps: string[] };
}

export interface TownscapeAsset extends RawAsset {
  pivotPx: PixelPoint;
  ground?: [PixelPoint, PixelPoint];
  entrancePx?: PixelPoint;
  hrefs: ReadonlyMap<string, URL>;
}

export function requireValue(value: unknown, message: string): asserts value {
  if (!value) throw Error(message);
}

const finite = (n: number) => Number.isFinite(n);
const point = (p: unknown): p is PixelPoint => Array.isArray(p) && p.length === 2 && p.every(finite);
const positive = (n: number) => finite(n) && n > 0;
const normalized = (p: unknown): p is PixelPoint => point(p) && p.every((n) => n >= 0 && n <= 1);
const pairOf = (points: unknown, predicate: (p: unknown) => boolean) =>
  Array.isArray(points) && points.length === 2 && points.every(predicate);

export function assetPath(path: string, directory: URL, extension: ".png" | ".json") {
  const url = new URL(path, directory);
  requireValue(typeof path === "string" && !path.startsWith("/") &&
    url.href.startsWith(directory.href) && url.pathname.endsWith(extension) && !url.search && !url.hash,
  `Asset path leaves ${directory.pathname} or has the wrong extension: ${path}`);
  return url;
}

export const toPixels = (frame: PixelPoint, uv: PixelPoint): PixelPoint => [uv[0] * frame[0], uv[1] * frame[1]];

function importAsset(raw: RawAsset, source: URL): TownscapeAsset {
  const id = raw?.asset_id;
  const check = (condition: unknown, field: string) =>
    requireValue(condition, `${id ?? source.pathname}: invalid ${field}`);
  check(typeof id === "string" && /^townscape\.b0[12]\.[a-z\d-]+$/.test(id), "asset ID");
  const frame = raw.source_dimensions_px;
  check(point(frame) && frame.every((n) => Number.isInteger(n) && n > 0), "source frame");
  check(normalized(raw.pivot_uv) && raw.authored_scale === 2, "2× authoring scale or pivot UV");
  check(positive(raw.world_width_f) && positive(raw.world_height_f), "size in frontage units");
  check(Array.isArray(raw.trim_rect_px) && raw.trim_rect_px.length === 4, "trim rectangle");
  const [x, y, w, h] = raw.trim_rect_px;
  check(raw.trim_rect_px.every(Number.isInteger) && x >= 0 && y >= 0 && positive(w) && positive(h) &&
    x + w <= frame[0] && y + h <= frame[1], "trim rectangle outside the untrimmed frame");
  check(typeof raw.files === "object" && raw.files !== null && Array.isArray(raw.layer_order) && Array.isArray(raw.states),
    "layer files, states or draw order");
  const dir = new URL("./", source);
  const hrefs = new Map(Object.entries(raw.files).map(([label, path]) => [label, assetPath(path, dir, ".png")]));
  const hasLayer = (n: string) => hrefs.has(n);
  check(raw.layer_order.length > 0 && raw.layer_order.every(hasLayer) &&
    new Set(raw.layer_order).size === raw.layer_order.length, "layer order or missing base layer");
  check(raw.states.filter((n) => n !== "base").every(hasLayer), "overlay state");
  if (raw.family !== "weather" && raw.family !== "mist" && raw.family !== "component") {
    check(Array.isArray(raw.footprint_f) && raw.footprint_f.length >= 3 &&
      raw.footprint_f.every(point), "footprint in frontage units");
    const footprint = raw.footprint_f!;
    const width = Math.max(...footprint.map((p) => p[0])) - Math.min(...footprint.map((p) => p[0]));
    const area = footprint.reduce((sum, p, i) => {
      const q = footprint[(i + 1) % footprint.length]!;
      return sum + p[0] * q[1] - p[1] * q[0];
    }, 0);
    check(Math.abs(width - raw.world_width_f) < 0.001 && Math.abs(area) > 0.00001, "degenerate or inconsistent footprint");
  }
  let entrancePx: PixelPoint | undefined;
  if (raw.entrance) {
    const { threshold_uv, clearance_f, mask } = raw.entrance;
    check(normalized(threshold_uv) && positive(clearance_f?.width) &&
      positive(clearance_f?.depth) && (!mask || hasLayer(mask)), "entrance threshold, corridor or mask");
    entrancePx = toPixels(frame, threshold_uv);
  }
  let ground: TownscapeAsset["ground"];
  if (raw.family === "shell") {
    check(pairOf(raw.ground_span_uv, normalized) && entrancePx && raw.foundation_modes?.length &&
      normalized(raw.semantic_anchors?.pick_uv) && normalized(raw.semantic_anchors?.sound_uv),
    "shell ground, foundation, entrance, pick or sound anchor");
    const [left, right] = raw.ground_span_uv!;
    ground = [toPixels(frame, left), toPixels(frame, right)];
    const widthPx = raw.world_width_f * raw.authored_scale * 72;
    check(Math.abs(ground[1][0] - ground[0][0] - widthPx) < 0.01 &&
      left[1] === right[1] && left[1] === raw.pivot_uv[1] &&
      raw.entrance!.threshold_uv[1] === left[1] &&
      entrancePx![0] >= ground[0][0] && entrancePx![0] <= ground[1][0], "shell ground span and entrance alignment");
    for (const [side, contact] of Object.entries(raw.wall_contacts ?? {})) {
      const span = side === "left" ? left : right;
      check((side === "left" || side === "right") && typeof contact.profile === "string" &&
        pairOf(contact.span_uv, normalized) &&
        contact.span_uv.every(([u]) => u === span[0]) &&
        contact.span_uv[0][1] < span[1] && contact.span_uv[1][1] === span[1] &&
        (!contact.exposed_end_layer || hasLayer(contact.exposed_end_layer)), `${side} shared wall`);
    }
  }
  if (raw.family === "foundation") {
    check(typeof raw.supported_mode === "string" && pairOf(raw.top_span_uv, normalized) &&
      raw.top_span_uv![0][0] < raw.top_span_uv![1][0] &&
      raw.top_span_uv!.every((p) => p[1] === raw.pivot_uv[1]), "foundation top span");
  }
  if (raw.family === "street" || raw.family === "ground") {
    check(raw.joins !== undefined && Object.keys(raw.joins).length > 0, "ground or street joins");
    if (raw.allowed_slope_deg) {
      check(pairOf(raw.allowed_slope_deg, (n) => typeof n === "number" && finite(n)) &&
        raw.allowed_slope_deg[0] <= raw.allowed_slope_deg[1], "allowed slopes");
    }
  }
  for (const [name, join] of Object.entries(raw.joins ?? {})) {
    check(normalized(join.uv) && typeof join.profile === "string", `join ${name}`);
  }
  for (const [name, socket] of Object.entries(raw.sockets ?? {})) {
    check(normalized(socket.uv) && Array.isArray(socket.accepts) && socket.accepts.length, `socket ${name}`);
  }
  if (raw.depth_parts) {
    const split = [...raw.depth_parts.rear, ...raw.depth_parts.front];
    check(new Set(split).size === split.length && raw.layer_order.every((n) => split.includes(n)) &&
      split.every(hasLayer), "split depth packets");
  }
  if (raw.family === "mist" || raw.family === "weather") {
    const fog = raw.distribution;
    check(fog && [fog.density, fog.falloff, fog.noise].every(hasLayer) && fog.band_gaps.length, "mist masks or gap coverage");
  }
  for (const room of raw.rooms ?? []) {
    check([room.backing, room.frame, room.unlit_before, room.unlit_overlay].every(hasLayer) &&
      room.pane_order.every((name) => {
        const pane = room.panes[name];
        return pane && hasLayer(pane.glass) && hasLayer(pane.clip_mask);
      }) && (!room.motion || (positive(room.motion.frame_duration_ms) &&
        room.motion.frames.length > 1 && room.motion.frames.every(hasLayer))), `room ${room.room_id}`);
  }
  return { ...raw, pivotPx: toPixels(frame, raw.pivot_uv), hrefs,
    ...(ground && { ground }), ...(entrancePx && { entrancePx }) };
}

interface Pack {
  schema_version: number;
  assets: RawAsset[];
  includes?: string[];
}

export async function readJson<T>(url: URL): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  requireValue(response.ok, `${url.pathname} returned ${response.status}`);
  return response.json() as Promise<T>;
}

export function importPacks(packs: ReadonlyMap<URL, Pack>) {
  const inventory = new Map<string, TownscapeAsset>();
  for (const [url, pack] of packs) {
    requireValue(pack?.schema_version === 1 && Array.isArray(pack.assets), `${url.pathname}: unsupported asset manifest`);
    for (const raw of pack.assets) {
      const art = importAsset(raw, url);
      requireValue(!inventory.has(art.asset_id), `Duplicate asset ${art.asset_id}`);
      inventory.set(art.asset_id, art);
    }
  }
  for (const art of inventory.values()) {
    for (const mount of art.mounts ?? []) {
      const part = inventory.get(mount.asset);
      const socket = art.sockets?.[mount.socket];
      requireValue(positive(mount.scale) && part?.family === "component" && socket &&
        part.accepts_sockets?.some((kind) => socket.accepts.includes(kind)) &&
        !socket.excludes?.includes(part.asset_id) && !part.excludes?.some((kind) => socket.accepts.includes(kind)),
      `${art.asset_id}: component ${mount.asset} does not fit ${mount.socket}`);
    }
  }
  return inventory;
}

export async function loadPacks(url: URL, root: URL) {
  const main = await readJson<Pack>(url);
  const extras = await Promise.all((main.includes ?? []).map(async (path) => {
    const included = new URL(path, url);
    requireValue(included.href.startsWith(root.href) && included.pathname.endsWith("/manifest.v1.json") &&
      !included.hash && !included.search, `Invalid included manifest: ${path}`);
    return [included, await readJson<Pack>(included)] as const;
  }));
  return importPacks(new Map([[url, main], ...extras]));
}
