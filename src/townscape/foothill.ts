import { GEOMETRY_CASES, generateWorldLayout, reachableRoadNodes } from "../generation/index.ts";
import type { WorldLayout } from "../generation/index.ts";
import { buildable, supportRange, terrainBand } from "../generation/site-ground.ts";
import type { Outline, Rectangle } from "../generation/site-ground.ts";
import { heightAt, seedFraction } from "../generation/terrain.ts";
import type { WorldPoint, WorldPosition } from "../generation/terrain.ts";
import type { PixelPoint } from "../model/assets.ts";
import type { StreetSegmentId } from "../model/network.ts";
import { UseKind } from "../model/places.ts";
import { EmitterMotionKind, EmitterPlacement, EmitterSourceKind, MixGroup, SoundCue, STREET_SOUND_CUES, USE_SOUND_CUES } from "../model/sound.ts";
import type { Soundscape } from "../model/sound.ts";
import { assetPath, requireValue, toPixels } from "./assets.ts";
import type { Side, TownscapeAsset } from "./assets.ts";
import { projectPoint, validateNeighbor } from "./fixture.ts";
import type { Hillside, Sprite } from "./fixture.ts";

type World = Extract<WorldLayout, { ok: true }>;
type Inventory = ReadonlyMap<string, TownscapeAsset>;
type Options = { shop?: "cafe" | "bookshop"; streets?: ReadonlyMap<StreetSegmentId, number> };
const ids = ["near", "middle", "far"] as const;
const epsilon = 1e-7;
const bounds = (points: readonly WorldPoint[]) => ({
  minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)),
  near: Math.min(...points.map(p => p.d)), far: Math.max(...points.map(p => p.d)),
});
const area = (minX: number, maxX: number, near: number, far: number): Rectangle => ({
  bounds: { minX, maxX, near, far },
  outline: [{ x: minX, d: near }, { x: maxX, d: near }, { x: maxX, d: far }, { x: minX, d: far }],
});

export function resolveFoothill(seed: string, inventory: Inventory, source: URL, previous?: {
  world: World; options: Options;
}) {
  const world = previous?.world ?? generateWorldLayout({ ...GEOMETRY_CASES.foothillTown, seed });
  requireValue(world.ok, `Foothill seed ${seed}: ${world.diagnostics.flatMap(d => d.shortfalls).join("; ")}`);
  const options = previous?.options ?? {};
  const { terrain, layout, roads } = world;
  requireValue(reachableRoadNodes(roads, roads.nodes[0]!.id).size === roads.nodes.length, "Disconnected foothill roads");

  // Keep perspective constant around each inhabited shelf and interpolate across the gaps.
  const scales = [1, .76, .53];
  const scaleAt = (d: number) => {
    let q = 1;
    for (let i = 1; i < scales.length; i++) {
      const start = terrain.benches[i - 1]!.depth + 1.35;
      const end = terrain.benches[i]!.depth - 1.35;
      q += (scales[i]! - scales[i - 1]!) * Math.max(0, Math.min(1, (d - start) / (end - start)));
    }
    return q;
  };
  const project = ({ x, d, h }: WorldPosition): PixelPoint => [960 + (x + .4) * 72 * scaleAt(d), 870 - 33 * d - 72 * scaleAt(d) * h];
  const ground = (p: WorldPoint) => project({ ...p, h: heightAt(terrain, p)! });
  const readArt = (id: string) => {
    const art = inventory.get(id);
    requireValue(art, `Missing ${id}`);
    return art;
  };
  const sprite = (art: TownscapeAsset, anchor: PixelPoint, q: number): Sprite =>
    ({ art, anchor, scale: q / art.authored_scale, mirror: false, opacity: 1 });

  const sky = assetPath("png/landscape/sky.png", new URL("./", source), ".png");
  const bands: Hillside["bands"] = ids.map((id, i) => {
    const outerDepth = i === 2 ? terrain.domain.maxDepth : (terrain.benches[i]!.depth + terrain.benches[i + 1]!.depth) / 2;
    const innerDepth = i === 0 ? 0 : (terrain.benches[i]!.depth + terrain.benches[i - 1]!.depth) / 2;
    const rows = [outerDepth, ...terrain.profiles.map(p => p.d).filter(d => d < outerDepth && d > innerDepth).reverse(), innerDepth];
    const profiles = rows.map(d => {
      const line = terrain.profiles[0]!.surface.map(({ x }) => ground({ x, d }));
      return [[0, line[0]![1]], ...line, [1920, line.at(-1)![1]]] as PixelPoint[];
    });
    const mistArt = i === 1 ? "townscape.b01.mist-sheet" : "townscape.b02.valley-mist";
    const mist = i === 0 ? undefined : {
      seconds: 130 + i * 20, drift: 60,
      sheets: [-10, 0, 10].map((x, index) => ({
        ...sprite(readArt(mistArt), ground({ x, d: innerDepth }), 1.4 + index * .08), opacity: .74,
      })),
    };
    return { id, q: scales[i]!, art: sky, terrainRange: [0, 1080], terrain: profiles, roads: [], patches: [], access: [],
      packets: { rear: [], ground: [], foundation: [], roads: [], structures: [], props: [], lip: [] }, ...(mist && { mist }) };
  });
  const roadById = new Map(roads.edges.map(edge => [edge.id, edge]));
  const nodes = new Map(roads.nodes.map(node => [node.id, node.position]));
  const projectedRoads = roads.edges.map(edge => {
    const start = edge.centerline[0]!, end = edge.centerline.at(-1)!;
    requireValue([start, end].every((p, i) => {
      const node = nodes.get(i === 0 ? edge.from : edge.to);
      return node && Math.hypot(p.x - node.x, p.d - node.d, p.h - node.h) < epsilon;
    }), `${edge.id}: detached junction`);
    const depth = Math.min(...edge.centerline.map(p => p.d));
    const band = bands[terrainBand(terrain, { x: start.x, d: depth })]!;
    const pieces = edge.centerline.slice(1).map((b, i) => {
      const a = edge.centerline[i]!;
      return [a, ...[.25, .5, .75].map(t => {
        const p = { x: a.x + (b.x - a.x) * t, d: a.d + (b.d - a.d) * t };
        return { ...p, h: heightAt(terrain, p)! };
      })].map(project);
    });
    const surface = (options.streets?.get(edge.id) ?? 0) % 2 ? edge.surface === "paving" ? "gravel" : "paving" : edge.surface;
    const road = { id: edge.id, band: band.id, kind: "lane" as const, path: [...pieces.flat(), project(end)],
      grades: edge.gradesDegrees, reveal: edge.apparentReveal * band.q * 72, surface };
    band.roads.push(road);
    return road;
  });

  const districts = new Map(layout.districts.map(section => [section.id, section]));
  const lotById = new Map(layout.lots.map(lot => [lot.id, lot]));
  const shop = layout.buildings.find(b => b.use === "cafe" || b.use === "bookshop");
  requireValue(shop, "Foothill town has no storefront");
  const shopUse = options.shop ?? (shop.use === "cafe" ? "cafe" : "bookshop");
  const shells = [...inventory.values()].filter(art => art.family === "shell");
  const seamFor = (b: typeof shop): Side | undefined => shop.sharedWalls.includes(b.id)
    ? b.root.x < shop.root.x ? "right" : "left" : undefined;
  const floor = Math.max(shop.root.h, ...layout.buildings.filter(b => seamFor(b)).map(b => b.root.h));

  const buildings = layout.buildings.map(b => {
    const lot = lotById.get(b.lotId)!;
    const envelope = lot.envelope!;
    const limits = bounds(envelope.footprint);
    const side = seamFor(b);
    const road = roadById.get(b.entrance.edgeId)!;
    const front = envelope.footprint[0].d;
    const direction = Math.sign(envelope.footprint[3].d - front);
    requireValue(Math.abs(envelope.footprint[1].d - front) < epsilon, `${b.id}: angled frontage`);
    const isShop = b === shop;
    const level = isShop || side ? floor : undefined;
    const candidates = shells.filter(art => isShop ? art.asset_id === "townscape.b01." + shopUse :
      b.use === "school" ? art.asset_id === "townscape.b02.school" :
      !/\.(cafe|bookshop|school|barn|inn)$/.test(art.asset_id) &&
        Boolean(art.wall_contacts?.left) === Boolean(envelope.wallContacts.length));
    const district = districts.get(lot.districtSectionId)!;
    const streetVersion = options.streets?.get(road.id) ?? 0;
    const score = (art: TownscapeAsset) => seedFraction(seed, `${b.id}:${streetVersion}:${art.asset_id}`) +
      (art.asset_id.endsWith(".bakery") && district.district !== "historic" ? .35 : 0);
    for (const art of candidates.sort((a, b) => score(a) - score(b))) {
      const artBounds = bounds(art.footprint_f!.map(([x, d]) => ({ x, d })));
      const width = art.world_width_f;
      const left = side === "left" ? limits.minX : side === "right" ? limits.maxX - width :
        (limits.minX + limits.maxX - width) / 2;
      const right = left + width;
      const clearance = art.entrance!.clearance_f;
      const edgeDepth = front - direction * envelope.setback;
      const laneDepth = edgeDepth - direction * road.width / 2;
      const minDepth = front + direction * artBounds.near;
      const maxDepth = front + direction * artBounds.far;
      const footprint = area(left, right, Math.min(minDepth, maxDepth), Math.max(minDepth, maxDepth));
      if (left < limits.minX - epsilon || right > limits.maxX + epsilon ||
        footprint.bounds.near < limits.near - epsilon || footprint.bounds.far > limits.far + epsilon ||
        art.world_height_f > envelope.maxHeight + epsilon || !buildable(terrain, footprint)) continue;
      const support = supportRange(terrain, footprint);
      const h = level ?? support.high;
      const mode = b.foundation.mode;
      const maximumRise = mode === "stepped_plinth" || b.use === "school" ? .38 : .21;
      if (!art.foundation_modes?.includes(mode) || h < support.high - epsilon || h - support.low > maximumRise) continue;
      if (side && art.wall_contacts?.[side]?.profile !== "historic-shared-73") continue;

      const unit = 72 * art.authored_scale;
      const x = left + (art.pivotPx[0] - art.ground![0][0]) / unit;
      const doorX = x + (art.entrancePx![0] - art.pivotPx[0]) / unit;
      const half = clearance.width / 2;
      const corridor = area(doorX - half, doorX + half, Math.min(front, laneDepth), Math.max(front, laneDepth));
      const landing = { x: doorX, d: edgeDepth };
      const lane = { x: doorX, d: laneDepth };
      const laneH = heightAt(terrain, lane)!;
      const rise = h - heightAt(terrain, landing)!;
      if (doorX - half < left - epsilon || doorX + half > right + epsilon || !buildable(terrain, corridor) ||
        envelope.setback > clearance.depth + epsilon || Math.abs(rise) > .18 ||
        !road.centerline.slice(1).some((p, i) => {
          const a = road.centerline[i]!;
          return Math.abs(a.d - laneDepth) < epsilon && Math.abs(p.d - laneDepth) < epsilon &&
            doorX >= Math.min(a.x, p.x) - epsilon && doorX <= Math.max(a.x, p.x) + epsilon;
        })) continue;

      const anchor = project({ x, d: front, h });
      const exposed: Side[] = (["left", "right"] as const).filter(end => isShop
        ? !layout.buildings.some(other => seamFor(other) === (end === "left" ? "right" : "left"))
        : end !== side);
      const placed = { ...sprite(art, anchor, scaleAt(front)), id: b.id, exposed, lights: isShop || score(art) < .18 };
      const stepCount = mode === "stepped_plinth" ? Math.ceil(width / .45) : 1;
      const pads = Array.from({ length: stepCount }, (_, i) => {
        const x0 = left + width * i / stepCount, x1 = left + width * (i + 1) / stepCount;
        const base = supportRange(terrain, area(x0, x1, footprint.bounds.near, footprint.bounds.far)).low;
        return { base, floor: h, outline: [
          project({ x: x0, d: front, h }), project({ x: x1, d: front, h }),
          project({ x: x1, d: front, h: base }), project({ x: x0, d: front, h: base }),
        ] as PixelPoint[] };
      });
      const threshold = projectPoint(placed, art.entrancePx!);
      // A raised threshold uses short stone steps across the reserved door corridor.
      const stepCountToRoad = Math.abs(rise) > .033 ? Math.ceil(Math.abs(rise) / .065) : 0;
      const landingH = heightAt(terrain, landing)!;
      if (stepCountToRoad > 3 || (stepCountToRoad && envelope.setback / stepCountToRoad < .026)) continue;
      const steps = Array.from({ length: stepCountToRoad }, (_, i) => {
        const d = front + (edgeDepth - front) * (i + 1) / stepCountToRoad;
        const stepTop = h + (landingH - h) * i / stepCountToRoad;
        return project({ x: doorX, d, h: stepTop });
      });
      const [firstStep, ...remainingSteps] = [...steps, ground(landing)];
      const path = [threshold, firstStep!, ...remainingSteps, project({ ...lane, h: laneH })] as const;
      const anchorFor = (uv: PixelPoint) => projectPoint(placed, toPixels(art.source_dimensions_px, uv));
      const [tx, ty, tw, th] = art.trim_rect_px;
      const hit = [projectPoint(placed, [tx, ty]), projectPoint(placed, [tx + tw, ty + th])] as const;
      return { id: b.id, siteId: b.siteId, lotId: b.lotId, band: lot.band, edgeId: road.id, sprite: placed,
        footprint: footprint.outline, support, floor: h, mode, pads, front, hit, pick: anchorFor(art.semantic_anchors!.pick_uv),
        sound: anchorFor(art.semantic_anchors!.sound_uv), entrance: { id: b.id, path, width: clearance.width * 72 * scaleAt(front) },
        use: isShop ? shopUse : b.use, sharedWalls: isShop ? shop.sharedWalls : side ? [shop.id] : [] };
    }
    throw Error(`${b.id}: no shell fits the foundation, walls and entrance`);
  });
  const slot = buildings.find(b => b.id === shop.id)!;
  for (const id of slot.sharedWalls) {
    const neighbor = buildings.find(b => b.id === id)!;
    const [left, right] = neighbor.front === slot.front && neighbor.sprite.anchor[0] < slot.sprite.anchor[0]
      ? [neighbor, slot] : [slot, neighbor];
    validateNeighbor(left.sprite, right.sprite, `${left.id} / ${right.id}`);
  }

  const lotOutline = (outline: Outline) => outline.map(ground);
  const lots = layout.lots.map(lot => ({ ...lot, polygon: lotOutline(lot.outline) }));
  const grounds: Record<string, [string, string?]> = {
    plaza: ["plaza-paving", "well"], park: ["park-ground", "bench"], playground: ["play-yard", "swing-and-slide"],
    orchard: ["orchard-soil"], field: ["field-stubble"], bus_stop: ["plaza-paving", "bench"],
  };
  for (const lot of lots) {
    const definition = grounds[lot.use];
    const band = bands[lot.band]!;
    const [a, b, c, d] = lot.outline;
    const x = (a.x + b.x + c.x + d.x) / 4;
    const depth = (a.d + b.d + c.d + d.d) / 4;
    if (definition) {
      const [paint, prop] = definition;
      band.patches!.push({ id: lot.id, outline: lot.polygon,
        color: lot.use === "plaza" || lot.use === "playground" ? "#aa9b7b66" : "#677c4d30" });
      band.packets.ground.push(sprite(readArt("townscape.b02." + paint), ground({ x, d: depth }), band.q * .65));
      if (prop) band.packets.props.push(sprite(readArt("townscape.b02." + prop), ground({ x, d: depth }), band.q * .75));
    }
    if ((lot.use === "garden" || lot.use === "orchard") && seedFraction(seed, lot.id) < .67) {
      band.packets.rear.push(sprite(readArt("townscape.b02." + (lot.use === "garden" ? "rowan" : "fir")),
        ground({ x, d: depth }), band.q * .9));
    }
  }

  for (const band of bands) {
    const index = ids.indexOf(band.id);
    const depth = terrain.benches[index]!.depth - 1.55;
    for (let i = 0; i < 14; i++) {
      const x = -14 + (i + seedFraction(seed, `tree:${band.id}:${i}`)) * 2.1;
      const d = depth + (seedFraction(seed, `tree-depth:${band.id}:${i}`) - .5) * .7;
      if (terrain.exclusions.some(exclusion => {
        const region = bounds(exclusion.polygon);
        return x >= region.minX && x <= region.maxX && d >= region.near && d <= region.far;
      }) || lots.some(lot => {
        const region = bounds(lot.outline);
        return x > region.minX - .25 && x < region.maxX + .25 && d > region.near - .3 && d < region.far + .3;
      }) || roads.edges.some(road => road.centerline.some(p => Math.hypot(x - p.x, d - p.d) < .65))) continue;
      const kind = i % 3 === 0 ? "fir" : "rowan";
      const tree = sprite(readArt("townscape.b02." + kind), ground({ x, d }), scaleAt(d) * (.55 + i % 3 * .16));
      band.packets.lip.push({ ...tree, id: `tree:${band.id}:${i}` });
    }
  }

  // Draw the far frontage first. The near frontage can occlude its own lane.
  buildings.sort((a, b) => b.band - a.band || b.front - a.front || a.sprite.anchor[0] - b.sprite.anchor[0]);
  for (const b of buildings) {
    const band = bands[b.band]!;
    band.packets.structures.push(b.sprite);
    for (const pad of b.pads) band.patches!.push({ id: b.id, outline: pad.outline, color: "#777364" });
  }
  for (const building of buildings) bands[building.band]!.access!.push(building.entrance);
  const publicLots = lots.filter(lot => lot.use === "plaza" || lot.use === "park" ||
    lot.use === "playground" || lot.use === "bus_stop");
  for (const lot of publicLots) {
    const edge = roadById.get(lot.entrance.edgeId);
    requireValue(edge && lot.entrance.distance >= 0 && lot.entrance.distance <= edge.walkingDistance,
      `${lot.id}: detached public entrance`);
    const { threshold, roadPoint } = lot.entrance;
    bands[lot.band]!.access!.push({ id: lot.id, path: [project(threshold), project(roadPoint)], width: 8 * bands[lot.band]!.q });
  }
  const entrances = bands.flatMap(band => band.access!);
  const hillside: Hillside = {
    sky, size: [1920, 1080], reducedSize: [960, 540], bands: [...bands].reverse(),
    roads: projectedRoads, entrances, slot: slot.sprite,
    exclusions: terrain.exclusions.map((e, i) => ({ id: `exclusion:${i}`, outline: e.polygon.map(ground) })),
    junctions: roads.nodes.map(n => ({ id: n.id, point: project(n.position) })),
  };
  const soundscape: Soundscape = { rain: { group: MixGroup.Rain, cue: SoundCue.SoftRain, gain: .55 },
    emitters: [...buildings.filter(b => b.use !== "house" || seedFraction(seed, b.id) < .25).map((b): Soundscape["emitters"][number] => {
      const kind = b.use === "cafe" ? UseKind.Cafe : b.use === "bookshop" ? UseKind.Bookshop :
        b.use === "school" ? UseKind.School : UseKind.House;
      return { id: `emitter:${b.id}`, group: MixGroup.Town, source: { kind: EmitterSourceKind.Building, buildingId: b.id },
        placement: EmitterPlacement.Indoor,
        motion: { kind: EmitterMotionKind.Stationary, position: { x: b.sound[0], y: b.sound[1], depth: b.band / 3 } },
        profile: { cues: USE_SOUND_CUES[kind], gain: b === slot ? .55 : .13, gapMs: { min: 3400, max: 13000 } } };
    }), ...projectedRoads.map((road): Soundscape["emitters"][number] => {
      const streetId = `street:${road.id}` as const;
      const [a, b, ...rest] = road.path.map(([x, y]) => ({ x, y, depth: ids.indexOf(road.band) / 3 }));
      const profile = layout.districts.find(d => d.edgeId === road.id)?.profile;
      return { id: `emitter:${streetId}`, group: MixGroup.Town, source: { kind: EmitterSourceKind.Street, streetId },
        placement: EmitterPlacement.Outdoor, motion: { kind: EmitterMotionKind.AlongPath, path: [a!, b!, ...rest] },
        profile: { cues: profile ? STREET_SOUND_CUES[profile].cues : [SoundCue.WetStoneFootsteps],
          gain: .15, gapMs: { min: 8000, max: 24000 } } };
    })],
  };
  return { world, options, hillside, buildings, lots, slot, soundscape };
}

export type Foothill = ReturnType<typeof resolveFoothill>;

export function replaceFoothill(scene: Foothill, target: "building" | "town" | StreetSegmentId,
  seed: string, inventory: Inventory, source: URL): Foothill {
  if (target === "town") return resolveFoothill(seed, inventory, source);
  const options = { ...scene.options };
  if (target === "building") {
    if (options.shop) delete options.shop;
    else options.shop = scene.slot.use === "cafe" ? "bookshop" : "cafe";
  } else {
    requireValue(scene.world.roads.edges.some(edge => edge.id === target), `Unknown street ${target}`);
    const streets = new Map(options.streets);
    streets.set(target, (streets.get(target) ?? 0) + 1);
    options.streets = streets;
  }
  const candidate = resolveFoothill(scene.world.recipe.seed, inventory, source, { world: scene.world, options });
  requireValue(candidate.buildings.every((b, i) => {
    const prior = scene.buildings[i]!;
    if (target === "building" && b.id === scene.slot.id) {
      return b.id === prior.id && b.mode === prior.mode && JSON.stringify([b.pads, b.entrance, b.sharedWalls]) ===
        JSON.stringify([prior.pads, prior.entrance, prior.sharedWalls]);
    }
    return b.edgeId === target ? b.id === prior.id : JSON.stringify(b) === JSON.stringify(prior);
  }), "Replacement exceeded its frontage boundary");
  const previousEmitters = new Map(scene.soundscape.emitters.map(emitter => [emitter.id, emitter]));
  return { ...candidate, soundscape: { rain: scene.soundscape.rain, emitters: candidate.soundscape.emitters.map(emitter => {
    const prior = previousEmitters.get(emitter.id);
    return prior && JSON.stringify(prior) === JSON.stringify(emitter) ? prior : emitter;
  }) } };
}
