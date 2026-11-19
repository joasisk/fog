import type { NonEmpty, Polygon, Polyline, ScenePosition } from "./geometry.ts";

export type JunctionId = `junction:${string}`;
export type StreetId = `street:${string}`;
export type StreetSegmentId = `segment:${string}`;
export type FrontageSectionId = `frontage:${string}`;
export type FootpathId = `footpath:${string}`;
export type SquareId = `square:${string}`;

export enum StreetRole {
  TownCenter = "town_center",
  Residential = "residential",
  Outskirts = "outskirts",
}

export enum StreetTraffic {
  Local = "local",
  Through = "through",
}

export enum FrontageSide {
  Near = "near",
  Far = "far",
}

export enum FrontageArrangement {
  Attached = "attached",
  Terraced = "terraced",
  Detached = "detached",
  Mixed = "mixed",
}

export enum StreetProfile {
  OldTown = "old-town",
  CivicSquare = "civic-square",
  Terraced = "terraced",
  Garden = "garden",
  VillageEdge = "village-edge",
}

interface StreetProfileDefaults {
  readonly role: StreetRole;
  readonly arrangement: FrontageArrangement;
}

export const STREET_PROFILE_DEFAULTS = {
  [StreetProfile.OldTown]: { role: StreetRole.TownCenter, arrangement: FrontageArrangement.Attached },
  [StreetProfile.CivicSquare]: { role: StreetRole.TownCenter, arrangement: FrontageArrangement.Mixed },
  [StreetProfile.Terraced]: { role: StreetRole.Residential, arrangement: FrontageArrangement.Terraced },
  [StreetProfile.Garden]: { role: StreetRole.Residential, arrangement: FrontageArrangement.Detached },
  [StreetProfile.VillageEdge]: { role: StreetRole.Outskirts, arrangement: FrontageArrangement.Detached },
} as const satisfies Readonly<Record<StreetProfile, StreetProfileDefaults>>;

/** Distances along a segment path in scene units, measured from its starting junction. */
export interface FrontageInterval {
  readonly start: number;
  readonly end: number;
}

export interface FrontageSection {
  readonly id: FrontageSectionId;
  readonly side: FrontageSide;
  readonly interval: FrontageInterval;
  readonly arrangement: FrontageArrangement;
  readonly profile?: StreetProfile;
}

export interface Junction {
  readonly id: JunctionId;
  readonly position: ScenePosition;
}

export interface NetworkSegment {
  readonly from: JunctionId;
  readonly to: JunctionId;
  readonly centerline: Polyline<ScenePosition>;
  /** Length along the centerline in scene units. */
  readonly walkingDistance: number;
}

export interface StreetSegment extends NetworkSegment {
  readonly id: StreetSegmentId;
  readonly width: number;
  readonly roadOutline: Polygon;
  readonly frontageSections: readonly FrontageSection[];
}

export interface Street {
  readonly id: StreetId;
  readonly role: StreetRole;
  readonly traffic: StreetTraffic;
  readonly segments: NonEmpty<StreetSegment>;
}

export interface Footpath {
  readonly id: FootpathId;
  readonly segments: NonEmpty<NetworkSegment>;
  readonly width: number;
}

export interface Square {
  readonly id: SquareId;
  readonly outline: Polygon;
  /** Connections across the square are represented by network segments. */
  readonly junctionIds: NonEmpty<JunctionId>;
}

export interface StreetNetwork {
  readonly junctions: NonEmpty<Junction>;
  readonly streets: NonEmpty<Street>;
  readonly footpaths: readonly Footpath[];
  readonly squares: readonly Square[];
}
