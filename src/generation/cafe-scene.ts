import {
  DepthLayer,
  EmitterMotionKind,
  EmitterPlacement,
  EmitterSourceKind,
  FoliageColor,
  FrontageArrangement,
  FrontageSide,
  MixGroup,
  SettlementKind,
  SiteEdgeKind,
  SiteKind,
  SoundCue,
  StreetProfile,
  StreetRole,
  StreetTraffic,
  UseKind,
} from "../model/index.ts";
import type { Junction, Polygon, Scene, SceneBounds, ScenePosition } from "../model/index.ts";

const bounds: SceneBounds = { min: { x: 0, y: 0 }, max: { x: 3840, y: 2160 } };

/** The fixed café layout used to bring up the browser app. */
export function createCafeScene(): Scene {
  const west: Junction = { id: "junction:west", position: { x: 0, y: 1780, depth: 0.5 } };
  const east: Junction = { id: "junction:east", position: { x: 3840, y: 1780, depth: 0.5 } };
  const entrance: ScenePosition = { x: 2375, y: 1640, depth: 0.58 };
  const footprint: Polygon<ScenePosition> = [
    { x: 1500, y: 1640, depth: 0.58 }, { x: 2610, y: 1640, depth: 0.58 },
    { x: 2610, y: 1575, depth: 0.68 }, { x: 1500, y: 1575, depth: 0.68 },
  ];

  return {
    town: {
      kind: SettlementKind.Village,
      seed: "cafe-pilot",
      bounds,
      terrain: {
        groundProfiles: [{
          depth: 0.65,
          elevations: [
            { x: 0, y: 1500 }, { x: 640, y: 1510 }, { x: 1350, y: 1540 },
            { x: 2610, y: 1560 }, { x: 3170, y: 1510 }, { x: 3840, y: 1480 },
          ],
        }],
        hills: [
          {
            depth: 0.93,
            layer: DepthLayer.Distance,
            silhouette: [
              { x: 0, y: 1130 }, { x: 450, y: 980 }, { x: 970, y: 1005 },
              { x: 1430, y: 1150 }, { x: 1960, y: 1075 }, { x: 2380, y: 870 },
              { x: 2790, y: 830 }, { x: 3230, y: 975 }, { x: 3840, y: 1060 },
              { x: 3840, y: 1670 }, { x: 0, y: 1670 },
            ],
          },
          {
            depth: 0.76,
            layer: DepthLayer.Distance,
            silhouette: [
              { x: 0, y: 1290 }, { x: 420, y: 1150 }, { x: 970, y: 1175 },
              { x: 1440, y: 1290 }, { x: 2160, y: 1410 }, { x: 2650, y: 1275 },
              { x: 3260, y: 1150 }, { x: 3840, y: 1230 },
              { x: 3840, y: 1680 }, { x: 0, y: 1680 },
            ],
          },
        ],
      },
      network: {
        junctions: [west, east],
        streets: [{
          id: "street:main",
          role: StreetRole.TownCenter,
          traffic: StreetTraffic.Local,
          segments: [{
            id: "segment:main",
            from: west.id,
            to: east.id,
            centerline: [west.position, east.position],
            width: 260,
            walkingDistance: 3840,
            roadOutline: [
              { x: 0, y: 1650 }, { x: 3840, y: 1650 },
              { x: 3840, y: 1910 }, { x: 0, y: 1910 },
            ],
            frontageSections: [{
              id: "frontage:main-far",
              side: FrontageSide.Far,
              interval: { start: 0, end: 3840 },
              arrangement: FrontageArrangement.Mixed,
              profile: StreetProfile.OldTown,
            }],
          }],
        }],
        footpaths: [],
        squares: [],
      },
      lots: [{ id: "lot:cafe", frontageSectionId: "frontage:main-far", interval: { start: 1400, end: 2710 } }],
      sites: [{
        id: "site:cafe",
        kind: SiteKind.Building,
        lotIds: ["lot:cafe"],
        entrance: { position: entrance, distanceAlongSegment: entrance.x, distanceToStreet: 140 },
        setback: 10,
        limits: {
          footprint,
          maxHeight: 950,
          startEdge: { kind: SiteEdgeKind.Clearance, minimum: 100 },
          endEdge: { kind: SiteEdgeKind.Clearance, minimum: 100 },
        },
      }],
      buildings: [{
        id: "building:cafe",
        siteId: "site:cafe",
        designId: "buildings/cafe/old-town/v01",
        position: { x: 2055, y: 1640, depth: 0.58 },
        layer: DepthLayer.MiddleDistance,
        footprint,
        width: 1110,
        height: 870,
        floorCount: 2,
        silhouette: [
          { x: 1500, y: 1640 }, { x: 1500, y: 1014 }, { x: 2055, y: 770 },
          { x: 2270, y: 865 }, { x: 2270, y: 790 }, { x: 2360, y: 790 },
          { x: 2360, y: 904 }, { x: 2610, y: 1014 }, { x: 2610, y: 1640 },
        ],
        uses: [
          { id: "use:cafe", kind: UseKind.Cafe, floors: [{ level: 0 }] },
          { id: "use:flats", kind: UseKind.Flats, floors: [{ level: 1 }], dwellingCount: 2 },
        ],
      }],
      vegetation: {
        trees: [{
          id: "tree:beech",
          designId: "trees/beech/mature/v01",
          position: { x: 790, y: 1910, depth: 0.21 },
          layer: DepthLayer.Foreground,
          height: 1320,
          crownSpread: 960,
          foliageColor: FoliageColor.Copper,
          silhouette: [
            { x: 285, y: 1050 }, { x: 300, y: 880 }, { x: 440, y: 795 },
            { x: 480, y: 677 }, { x: 660, y: 621 }, { x: 798, y: 590 },
            { x: 927, y: 648 }, { x: 1070, y: 670 }, { x: 1200, y: 790 },
            { x: 1245, y: 965 }, { x: 1160, y: 1100 }, { x: 1125, y: 1215 },
            { x: 946, y: 1295 }, { x: 802, y: 1260 }, { x: 676, y: 1345 },
            { x: 500, y: 1270 }, { x: 365, y: 1205 },
          ],
        }],
        woodedPatches: [],
      },
      puddles: [{
        position: { x: 2180, y: 1820, depth: 0.44 },
        outline: [
          { x: 1800, y: 1815 }, { x: 1950, y: 1798 }, { x: 2240, y: 1802 },
          { x: 2530, y: 1823 }, { x: 2630, y: 1836 }, { x: 2290, y: 1850 },
          { x: 1990, y: 1840 },
        ],
      }],
      decorations: [],
    },
    weather: {
      rain: { dropsPerSecond: 100, velocity: { x: -60, y: 520 } },
      fogBanks: [{
        bounds: { min: { x: 0, y: 1040 }, max: { x: 3840, y: 1540 } },
        layer: DepthLayer.MiddleDistance,
        depth: 0.66,
        driftPerSecond: { x: 25, y: 0 },
        opacity: 0.25,
      }],
    },
    soundscape: {
      rain: { group: MixGroup.Rain, cue: SoundCue.SoftRain, gain: 0.35 },
      emitters: [{
        id: "emitter:cafe",
        group: MixGroup.Town,
        source: { kind: EmitterSourceKind.Use, useId: "use:cafe" },
        placement: EmitterPlacement.Indoor,
        motion: { kind: EmitterMotionKind.Stationary, position: entrance },
        profile: { cues: [SoundCue.AdultVoices, SoundCue.MilkSteamer], gapMs: { min: 1500, max: 6500 }, gain: 0.7 },
      }],
    },
  };
}
