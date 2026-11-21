import type { GenerationSeed } from "../model/scene.ts";
import { buildRoadGraph } from "./roads.ts";
import type { RoadGraph } from "./roads.ts";
import { analyzeTerrain, selectTiers } from "./settlement.ts";
import type { Capacity, SettlementTier } from "./settlement.ts";
import { generateTerrain } from "./terrain.ts";
import type { Terrain, TerrainPreset } from "./terrain.ts";
import { layoutOnRoads } from "./layout.ts";
import type { TownLayout } from "./layout.ts";
import type { Morphology } from "./districts.ts";

export interface WorldRecipe {
  readonly version: 1;
  readonly seed: GenerationSeed;
  readonly terrainPreset: TerrainPreset;
  readonly requestedTier?: SettlementTier;
  readonly allowSmallerTier?: boolean;
  readonly morphology?: Morphology;
}

export interface TierDiagnostic {
  readonly tier: SettlementTier;
  readonly stage: "terrain" | "roads" | "layout";
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
export type AcceptedGeometry = Extract<WorldGeometry, { ok: true }>;
type RejectedGeometry = Extract<WorldGeometry, { ok: false }>;
export type WorldLayout = (AcceptedGeometry & { readonly layout: TownLayout }) | RejectedGeometry;

export const GEOMETRY_CASES = {
  foothillTown: { version: 1, seed: "7419", terrainPreset: "foothills", requestedTier: "town" },
  contourFarmLane: { version: 1, seed: "9106", terrainPreset: "contour", requestedTier: "farm-lane" },
} as const satisfies Record<string, WorldRecipe>;

export const LAYOUT_CASES = {
  ...GEOMETRY_CASES,
  broadFoothillCity: { version: 1, seed: "1609", terrainPreset: "broad-foothills", requestedTier: "city" },
} as const satisfies Record<string, WorldRecipe>;

function resolveWorld<T extends AcceptedGeometry>(recipe: WorldRecipe,
  finish: (world: AcceptedGeometry) => { ok: true; world: T } | { ok: false; shortfalls: string[] }): T | RejectedGeometry {
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
      const result = finish({ ...snapshot, ok: true, tier, terrainCapacity: capacity, roadCapacity: roads.capacity, roads: roads.graph });
      if (result.ok) return result.world;
      diagnostics.push({ tier, stage: "layout", shortfalls: result.shortfalls });
      continue;
    }
    diagnostics.push({ tier, stage: "roads", shortfalls: roads.shortfalls });
  }
  return { ...snapshot, ok: false };
}

export function generateWorldGeometry(recipe: WorldRecipe): WorldGeometry {
  return resolveWorld(recipe, (world) => ({ ok: true, world }));
}

export function generateWorldLayout(recipe: WorldRecipe): WorldLayout {
  return resolveWorld(recipe, (world) => {
    const result = layoutOnRoads(world, recipe.morphology);
    return result.ok ? { ok: true, world: { ...world, layout: result.layout } } : result;
  });
}

export { layoutOnRoads };
export type { TownLayout } from "./layout.ts";
export { renderLayoutDebug } from "./layout-debug.ts";
export { renderGeometryDebug } from "./debug.ts";
export { GEOMETRY_FIXTURE_MANIFEST, GEOMETRY_FIXTURES } from "./fixtures.ts";
export { reachableRoadNodes } from "./roads.ts";
export { heightAt, sampleAt } from "./terrain.ts";
