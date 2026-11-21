import type { SceneBounds } from "./geometry.ts";
import type { Decoration, Puddle, Terrain, Vegetation, Weather } from "./landscape.ts";
import type { StreetNetwork } from "./network.ts";
import type { Building, Lot, Site } from "./places.ts";
import type { Soundscape } from "./sound.ts";

export enum SettlementKind {
  Village = "village",
  Town = "town",
  City = "city",
  Hamlet = "hamlet",
  FarmLane = "farm-lane",
  Farmstead = "farmstead",
}

export type GenerationSeed = string;

export interface Town {
  readonly kind: SettlementKind;
  readonly seed: GenerationSeed;
  readonly bounds: SceneBounds;
  readonly terrain: Terrain;
  readonly network: StreetNetwork;
  readonly lots: readonly Lot[];
  readonly sites: readonly Site[];
  readonly buildings: readonly Building[];
  readonly vegetation: Vegetation;
  readonly puddles: readonly Puddle[];
  readonly decorations: readonly Decoration[];
}

/** The generated snapshot shared by drawing, hit testing, and audio. */
export interface Scene {
  readonly town: Town;
  readonly weather: Weather;
  readonly soundscape: Soundscape;
}
