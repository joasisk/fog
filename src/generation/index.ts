import type { GenerationSeed } from "../model/scene.ts";
import { buildRoadGraph } from "./roads.ts";
import type { RoadGraph } from "./roads.ts";
import { analyzeTerrain, selectTiers } from "./settlement.ts";
import type { Capacity, SettlementTier } from "./settlement.ts";
import { generateTerrain } from "./terrain.ts";
import type { Terrain, TerrainPreset } from "./terrain.ts";

export interface WorldRecipe {
  readonly version: 1;
  readonly seed: GenerationSeed;
  readonly terrainPreset: TerrainPreset;
  readonly requestedTier?: SettlementTier;
  readonly allowSmallerTier?: boolean;
}

export interface TierDiagnostic {
  readonly tier: SettlementTier;
  readonly stage: "terrain" | "roads";
  readonly shortfalls: readonly string[];
}

export type WorldGeometry = {
  readonly version: 1;
  readonly recipe: WorldRecipe;
  readonly terrain: Terrain;
  readonly diagnostics: readonly TierDiagnostic[];
} & (
  | { readonly ok: true; readonly tier: SettlementTier; readonly terrainCapacity: Capacity;
    readonly roadCapacity: Capacity; readonly roads: RoadGraph }
  | { readonly ok: false }
);

export const GEOMETRY_CASES = {
  foothillTown: { version: 1, seed: "7419", terrainPreset: "foothills", requestedTier: "town" },
  contourFarmLane: { version: 1, seed: "9106", terrainPreset: "contour", requestedTier: "farm-lane" },
} as const satisfies Record<string, WorldRecipe>;

export function generateWorldGeometry(recipe: WorldRecipe): WorldGeometry {
  const terrain = generateTerrain(recipe.seed, recipe.terrainPreset);
  const analysis = analyzeTerrain(terrain);
  const diagnostics: TierDiagnostic[] = [];
  const snapshot = { version: 1 as const, recipe, terrain, diagnostics };
  for (const { tier, capacity, shortfalls } of selectTiers(
    terrain, analysis, recipe.seed, recipe.requestedTier, recipe.allowSmallerTier,
  )) {
    if (shortfalls.length) {
      diagnostics.push({ tier, stage: "terrain", shortfalls });
      continue;
    }
    const roads = buildRoadGraph(terrain, analysis, tier, recipe.seed);
    if ("graph" in roads) {
      return { ...snapshot, ok: true, tier, terrainCapacity: capacity, roadCapacity: roads.capacity, roads: roads.graph };
    }
    diagnostics.push({ tier, stage: "roads", shortfalls: roads.shortfalls });
  }
  return { ...snapshot, ok: false };
}

export { renderGeometryDebug } from "./debug.ts";
export { GEOMETRY_FIXTURE_MANIFEST, GEOMETRY_FIXTURES } from "./fixtures.ts";
export { reachableRoadNodes } from "./roads.ts";
export { heightAt, sampleAt } from "./terrain.ts";
