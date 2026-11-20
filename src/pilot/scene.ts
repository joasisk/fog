import { BuildingType } from "../model/building-designs.ts";
import { AssetVariant } from "../model/assets.ts";
import { DepthLayer } from "../model/geometry.ts";
import type { Polygon, ScenePosition } from "../model/geometry.ts";
import { FoliageColor, TreeSpecies, TreeStage } from "../model/landscape.ts";
import { FrontageArrangement, FrontageSide, StreetProfile, StreetRole, StreetTraffic } from "../model/network.ts";
import { SiteEdgeKind, SiteKind, UseKind } from "../model/places.ts";
import type { Building, BuildingSite, Lot } from "../model/places.ts";
import { SettlementKind } from "../model/scene.ts";
import type { Scene } from "../model/scene.ts";
import { EmitterMotionKind, EmitterPlacement, EmitterSourceKind, MixGroup, SoundCue } from "../model/sound.ts";
import type { SoundEmitter } from "../model/sound.ts";

import { createResidential } from "./residential.ts";

export const marketStreet = "street:market-lane";
export const width = 960;
export const height = 540;
export const streetY = 410;
export const streetDepth = 0.36;
export const shopSite = "site:shop";
export type Shop = UseKind.Cafe | UseKind.Bookshop;

const frontage = "frontage:market-lane";
const foundationY = 370;
const depth = 0.42;

const point = (x: number, y: number, depth: number): ScenePosition => ({ x, y, depth });

export function seededRandom(seed: number) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

function parcel(name: string, left: number, right: number, outerEdge: "start" | "end") {
  const lot: Lot = { id: `lot:${name}`, frontageSectionId: frontage, interval: { start: left, end: right } };
  const footprint: Polygon<ScenePosition> = [
    point(left, 344, .5), point(right, 344, .5),
    point(right, foundationY, depth), point(left, foundationY, depth),
  ];
  const shared = { kind: SiteEdgeKind.SharedWall } as const;
  const clearance = { kind: SiteEdgeKind.Clearance, minimum: 16 } as const;
  const site: BuildingSite = {
    id: `site:${name}`,
    kind: SiteKind.Building,
    lotIds: [lot.id],
    setback: streetY - foundationY,
    entrance: { position: point(right - 37, foundationY, depth), distanceAlongSegment: right - 37, distanceToStreet: streetY - foundationY },
    limits: {
      footprint, maxHeight: 222,
      startEdge: outerEdge === "start" ? clearance : shared,
      endEdge: outerEdge === "end" ? clearance : shared,
    },
  };
  return { lot, site };
}

function silhouette(left: number, right: number, eave: number, peak: number): Polygon {
  return [
    { x: left, y: foundationY }, { x: left, y: eave },
    { x: (left + right) / 2, y: peak }, { x: right, y: eave }, { x: right, y: foundationY },
  ];
}

export function createPilot(seed = 7231): Scene {
  const random = seededRandom(seed);
  const seam = 598 + Math.round(random() * 24);
  const shopWidth = 203 + Math.round(random() * 30);
  const houseWidth = 135 + Math.round(random() * 25);
  const shop = parcel("shop", seam - shopWidth, seam, "start");
  const house = parcel("house", seam, seam + houseWidth, "end");
  const houseRoof = 171 + Math.round(random() * 30);
  const streetStart = point(0, streetY, streetDepth);
  const streetEnd = point(width, streetY, streetDepth);
  const treeX = 238 + Math.round(random() * 24);
  const hillHeight = 128 + Math.round(random() * 55);
  const curb = 378 + Math.round(random() * 10);
  const residential = createResidential(random, streetEnd);

  const buildings: [Building, Building] = [
    {
      id: "building:shop", siteId: shop.site.id,
      designId: `buildings/cafe/old-town/${AssetVariant.V01}`,
      position: point(seam - shopWidth / 2, foundationY, depth), layer: DepthLayer.MiddleDistance,
      footprint: shop.site.limits.footprint, width: shopWidth, height: 221, floorCount: 2,
      silhouette: silhouette(seam - shopWidth, seam, 211, 149),
      uses: [{ id: "use:shop", kind: UseKind.Cafe, floors: [{ level: 0 }] },
        { id: "use:flats", kind: UseKind.Flats, floors: [{ level: 1 }], dwellingCount: 2 }],
    },
    {
      id: "building:house", siteId: house.site.id,
      designId: `buildings/terraced-house/old-town/${AssetVariant.V01}`,
      position: point(seam + houseWidth / 2, foundationY, depth), layer: DepthLayer.MiddleDistance,
      footprint: house.site.limits.footprint, width: houseWidth, height: foundationY - houseRoof, floorCount: 2,
      silhouette: silhouette(seam, seam + houseWidth, 227, houseRoof),
      uses: [{ id: "use:house", kind: UseKind.House, floors: [{ level: 0 }, { level: 1 }], dwellingCount: 1 }],
    },
  ];
  return {
    town: {
      kind: SettlementKind.Village,
      seed: String(seed),
      bounds: { min: { x: 0, y: 0 }, max: { x: width, y: height } },
      terrain: {
        groundProfiles: [{ depth: streetDepth, elevations: [streetStart, streetEnd] }],
        hills: [{
          depth: .88, layer: DepthLayer.Distance,
          silhouette: [{ x: 0, y: 225 }, { x: 110, y: 172 }, { x: 305, y: hillHeight },
            { x: 520, y: 223 }, { x: 733, y: 275 - hillHeight }, { x: width, y: 214 },
            { x: width, y: 375 }, { x: 0, y: 375 }],
        }],
      },
      network: {
        junctions: [{ id: "junction:west", position: streetStart }, { id: "junction:east", position: streetEnd }, residential.junction],
        streets: [{
          id: marketStreet, role: StreetRole.TownCenter, traffic: StreetTraffic.Local,
          segments: [{
            id: "segment:market-lane", from: "junction:west", to: "junction:east",
            centerline: [streetStart, streetEnd], walkingDistance: width, width: 54,
            roadOutline: [{ x: 0, y: 385 }, { x: 425, y: curb }, { x: width, y: 385 }, { x: width, y: 452 }, { x: 0, y: 452 }],
            frontageSections: [{
              id: frontage, side: FrontageSide.Far, interval: { start: 0, end: width },
              arrangement: FrontageArrangement.Attached, profile: StreetProfile.OldTown,
            }],
          }],
        }, residential.street],
        footpaths: [], squares: [],
      },
      lots: [shop.lot, house.lot, ...residential.lots],
      sites: [shop.site, house.site, residential.site, residential.park],
      buildings: [residential.house, ...buildings],
      vegetation: {
        woodedPatches: [],
        trees: [{
          id: "tree:maple", designId: `trees/${TreeSpecies.NorwayMaple}/${TreeStage.Mature}/${AssetVariant.V01}`,
          position: point(treeX, 472, .12), layer: DepthLayer.Foreground,
          crownSpread: 254, height: 345, foliageColor: FoliageColor.BurntOrange,
          silhouette: [{ x: treeX - 120, y: 217 }, { x: treeX, y: 130 }, { x: treeX + 130, y: 217 },
            { x: treeX + 24, y: 351 }, { x: treeX + 13, y: 472 }, { x: treeX - 12, y: 472 }, { x: treeX - 24, y: 349 }],
        }],
      },
      puddles: [], decorations: [],
    },
    weather: {
      rain: { dropsPerSecond: 120, velocity: { x: -32, y: 285 } },
      fogBanks: [{ bounds: { min: { x: -200, y: 180 }, max: { x: width + 200, y: 415 } },
        depth: .4, layer: DepthLayer.MiddleDistance, driftPerSecond: { x: 17, y: 0 }, opacity: .4 }],
    },
    soundscape: { rain: { group: MixGroup.Rain, cue: SoundCue.SoftRain, gain: .55 }, emitters: [shopEmitter(shop.site, UseKind.Cafe), residential.emitter,
      houseEmitter(house.site, BuildingType.TerracedHouse), houseEmitter(residential.site, BuildingType.DetachedHouse),
      ...streetSounds(streetStart, streetEnd)] },
  };
}

function shopEmitter(site: BuildingSite, kind: Shop): SoundEmitter {
  return {
    id: "emitter:shop-door",
    buildingType: kind === UseKind.Cafe ? BuildingType.Cafe : BuildingType.Bookshop,
    group: MixGroup.Town,
    source: { kind: EmitterSourceKind.Use, useId: "use:shop" },
    placement: EmitterPlacement.Indoor,
    motion: { kind: EmitterMotionKind.Stationary, position: site.entrance.position },
    profile: kind === UseKind.Cafe
      ? { cues: [SoundCue.CafeChatter, SoundCue.MilkSteamer], gapMs: { min: 1000, max: 2600 }, gain: .8 }
      : { cues: [SoundCue.DoorChime, SoundCue.PageTurn, SoundCue.DoorOpening], gapMs: { min: 1600, max: 3200 }, gain: .67 },
  };
}

export function replaceShop(scene: Scene, kind: Shop): Scene {
  const site = scene.town.sites.find((site): site is BuildingSite => site.id === shopSite && site.kind === SiteKind.Building);
  if (!site) return scene;
  return {
    ...scene,
    town: {
      ...scene.town,
      buildings: scene.town.buildings.map((building) => building.siteId === shopSite ? {
        ...building,
        designId: `buildings/${kind}/old-town/${AssetVariant.V01}`,
        uses: [{ ...building.uses[0], kind }, ...building.uses.slice(1)],
      } : building),
    },
    soundscape: { ...scene.soundscape, emitters: scene.soundscape.emitters.map((emitter) =>
      emitter.id === "emitter:shop-door" ? shopEmitter(site, kind) : emitter) },
  };
}

function houseEmitter(site: BuildingSite, buildingType: BuildingType): SoundEmitter {
  return {
    id: `emitter:${site.id.slice("site:".length)}-door`,
    buildingType,
    group: MixGroup.Town,
    source: { kind: EmitterSourceKind.Building, buildingId: `building:${site.id.slice("site:".length)}` },
    placement: EmitterPlacement.Indoor,
    motion: { kind: EmitterMotionKind.Stationary, position: site.entrance.position },
    profile: { cues: [SoundCue.DoorLatch, SoundCue.DoorOpening, SoundCue.HouseholdMurmur], gapMs: { min: 19000, max: 38000 }, gain: .47 },
  };
}

function streetSounds(start: ScenePosition, end: ScenePosition): SoundEmitter[] {
  return [
    {
      id: "emitter:footsteps", group: MixGroup.Town, placement: EmitterPlacement.Outdoor,
      source: { kind: EmitterSourceKind.Street, streetId: marketStreet },
      motion: { kind: EmitterMotionKind.AlongPath, path: [point(345, start.y - 22, start.depth), point(710, end.y - 22, end.depth)] },
      profile: { cues: [SoundCue.WetPavementFootsteps], gapMs: { min: 6500, max: 14000 }, gain: .68 },
    },
    {
      id: "emitter:car", group: MixGroup.Town, placement: EmitterPlacement.Outdoor,
      source: { kind: EmitterSourceKind.Street, streetId: marketStreet },
      motion: { kind: EmitterMotionKind.AlongPath, path: [end, start] },
      profile: { cues: [SoundCue.PassingCar], gapMs: { min: 16000, max: 32000 }, gain: .55 },
    },
  ];
}
