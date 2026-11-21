import type { GenerationSeed } from "../model/scene.ts";

export type TerrainPreset = "foothills" | "contour" | "broad-foothills";
export type ExclusionKind = "water" | "cliff" | "saturated";

export interface WorldPoint { readonly x: number; readonly d: number }
export interface WorldPosition extends WorldPoint { readonly h: number }
export interface TerrainSample extends WorldPosition {
  readonly id: number;
  readonly slopeDegrees: number;
  readonly exclusion: ExclusionKind | null;
  readonly buildable: boolean;
}

export interface TerrainBench {
  readonly minX: number;
  readonly maxX: number;
  readonly depth: number;
  /** Shelf depth in F at evenly spaced x samples, including both ends. */
  readonly centerDepths?: readonly number[];
}

export function benchDepthAt(bench: TerrainBench, x: number): number {
  if (!bench.centerDepths) return bench.depth;
  const last = bench.centerDepths.length - 1;
  const t = Math.max(0, Math.min(1, (x - bench.minX) / (bench.maxX - bench.minX))) * last;
  const index = Math.floor(t);
  const a = bench.centerDepths[index]!;
  const b = bench.centerDepths[Math.min(index + 1, last)]!;
  return a + (b - a) * (t - index);
}

export interface Terrain {
  readonly preset: TerrainPreset;
  readonly domain: { readonly minX: number; readonly maxX: number; readonly maxDepth: number };
  readonly step: number;
  readonly columns: number;
  readonly rows: number;
  readonly samples: readonly TerrainSample[];
  readonly profiles: readonly { readonly d: number; readonly surface: readonly WorldPosition[];
    readonly fillBase: number }[];
  readonly exclusions: readonly { readonly kind: ExclusionKind; readonly polygon: readonly WorldPoint[] }[];
  readonly buildableRegions: readonly { readonly sampleIds: readonly number[]; readonly area: number }[];
  readonly approaches: readonly { readonly id: string; readonly sampleId: number; readonly side: "west" | "east" }[];
  readonly crossings: readonly { readonly id: string; readonly from: number; readonly to: number;
    readonly kind: "bridge" }[];
  /** Terrain-derived route preferences. Depth is resolved on the common height surface. */
  readonly benches: readonly TerrainBench[];
}

export function seedFraction(seed: GenerationSeed, stage: string): number {
  let hash = 2166136261;
  const key = JSON.stringify([seed, stage]);
  for (let i = 0; i < key.length; i++) {
    hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  }
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  return ((hash ^ (hash >>> 13)) >>> 0) / 4294967296;
}

const degrees = (slope: number) => Math.atan(slope) * 180 / Math.PI;
const smoothstep = (t: number) => {
  const value = Math.max(0, Math.min(1, t));
  return value * value * (3 - 2 * value);
};

export function generateTerrain(seed: GenerationSeed, preset: TerrainPreset): Terrain {
  const step = 0.5;
  const broad = preset === "broad-foothills";
  const domain = { minX: -15, maxX: 15, maxDepth: broad ? 27 : 13 };
  const columns = (domain.maxX - domain.minX) / step + 1;
  const rows = domain.maxDepth / step + 1;
  const phase = seedFraction(seed, "terrain:long-profile") * Math.PI * 2;
  const detail = seedFraction(seed, "terrain:short-profile") * Math.PI * 2;
  const rural = preset === "contour";
  const bendAt = (x: number) => (rural ? 0.75 : 0.3) * Math.sin(x / 6 + phase);
  const height = (x: number, d: number) => {
    const depth = d - bendAt(x);
    const rolling = 0.37 * Math.sin(x / 6 + phase) + 0.1 * Math.sin(x / 2.6 + detail + d / 9);
    if (rural) {
      return rolling + 0.04 * depth + 2.2 * smoothstep((depth - 1) / 4)
        + 2.8 * smoothstep((depth - 8.5) / 4);
    }
    const upperBenches = broad ? 0.3 * (smoothstep((depth - 12) / 3) + smoothstep((depth - 16.5) / 3)
      + smoothstep((depth - 21) / 3)) : 0;
    return rolling + upperBenches + 0.025 * depth + 0.3 * smoothstep((depth - 3) / 2.8)
      + 0.33 * smoothstep((depth - 7.3) / 3) - 0.75 * (1 - smoothstep(depth / 2));
  };
  const samples = Array.from({ length: rows * columns }, (_, id): TerrainSample => {
    const x = domain.minX + (id % columns) * step;
    const d = Math.floor(id / columns) * step;
    const h = height(x, d);
    const dx = (height(x + step / 2, d) - height(x - step / 2, d)) / step;
    const dd = (height(x, d + step / 2) - height(x, d - step / 2)) / step;
    const slopeDegrees = degrees(Math.hypot(dx, dd));
    const pool = !rural && Math.abs(x - 7) < 3 && d < 1.25 && h < 0.1;
    const exclusion = pool ? (d < 0.5 ? "water" : "saturated")
      : slopeDegrees > 23 ? "cliff" : null;
    return { id, x, d, h, slopeDegrees, exclusion, buildable: exclusion === null && slopeDegrees <= 12 };
  });

  const bounds = (sample: TerrainSample) => ({
    left: Math.max(domain.minX, sample.x - step / 2),
    right: Math.min(domain.maxX, sample.x + step / 2),
    near: Math.max(0, sample.d - step / 2),
    far: Math.min(domain.maxDepth, sample.d + step / 2),
  });
  const exclusions = samples.flatMap((sample) => {
    if (!sample.exclusion) return [];
    const { left, right, near, far } = bounds(sample);
    return [{ kind: sample.exclusion, polygon: [
      { x: left, d: near }, { x: right, d: near }, { x: right, d: far }, { x: left, d: far },
    ] }];
  });

  const buildableRegions = [];
  const visited = new Set<number>();
  for (const sample of samples) {
    if (!sample.buildable || visited.has(sample.id)) continue;
    const sampleIds = [sample.id];
    visited.add(sample.id);
    let area = 0;
    for (const id of sampleIds) {
      const cell = samples[id]!;
      const { left, right, near, far } = bounds(cell);
      area += (right - left) * (far - near);
      for (const neighbor of gridNeighbors(columns, rows, id)) {
        if (!samples[neighbor]!.buildable || visited.has(neighbor)) continue;
        visited.add(neighbor);
        sampleIds.push(neighbor);
      }
    }
    buildableRegions.push({ area, sampleIds });
  }

  const bench = (depth: number, minX: number, maxX: number): TerrainBench => ({
    depth, minX, maxX,
    centerDepths: Array.from({ length: (maxX - minX) / step + 1 }, (_, i) => depth + bendAt(minX + i * step)),
  });
  const primary = bench(rural ? 6.5 : 2.5, domain.minX, domain.maxX);
  const benches = broad ? [primary, ...[6, 11, 15.5, 20, 24.5].map((d) => bench(d, -14.5, 14.5))]
    : rural ? [primary] : [primary, bench(6, -12, 12), bench(11, -10, 10)];
  const approaches = (["west", "east"] as const).flatMap((side) => {
    const x = side === "west" ? domain.minX : domain.maxX;
    const approachDepth = benchDepthAt(primary, x);
    const candidate = samples.filter((sample) => sample.x === x && sample.buildable &&
      Math.abs(sample.d - approachDepth) <= 1.5)
      .sort((a, b) => Math.abs(a.d - approachDepth) + a.slopeDegrees / 8
        - Math.abs(b.d - approachDepth) - b.slopeDegrees / 8 || a.id - b.id)[0];
    return candidate ? [{ id: `approach:${side}`, sampleId: candidate.id, side }] : [];
  });

  const fillBase = Math.min(...samples.map(({ h }) => h)) - 1.5;
  const depths = broad ? benches.map(({ depth }) => depth) : rural ? [1, 4, 6.5, 9, 12] : [0, 2.5, 4.5, 6, 9, 11.5];
  return {
    preset, domain, step, columns, rows, samples, exclusions, buildableRegions, approaches,
    crossings: [], benches,
    profiles: depths.map((d) => {
      const start = Math.round(d / step) * columns;
      return { d, fillBase, surface: samples.slice(start, start + columns) };
    }),
  };
}

export function gridNeighbors(columns: number, rows: number, id: number): number[] {
  const x = id % columns;
  const d = Math.floor(id / columns);
  const neighbors: number[] = [];
  if (x > 0) neighbors.push(id - 1);
  if (x < columns - 1) neighbors.push(id + 1);
  if (d > 0) neighbors.push(id - columns);
  if (d < rows - 1) neighbors.push(id + columns);
  return neighbors;
}

/** Bilinear interpolation on the sampled domain. There is no support outside it. */
export function heightAt(terrain: Terrain, { x, d }: WorldPoint): number | undefined {
  const column = (x - terrain.domain.minX) / terrain.step;
  const row = d / terrain.step;
  if (column < 0 || column > terrain.columns - 1 || row < 0 || row > terrain.rows - 1) return undefined;
  const i = Math.min(Math.floor(column), terrain.columns - 2);
  const j = Math.min(Math.floor(row), terrain.rows - 2);
  const start = j * terrain.columns + i;
  const near = terrain.samples[start]!.h * (1 - (column - i)) + terrain.samples[start + 1]!.h * (column - i);
  const far = terrain.samples[start + terrain.columns]!.h * (1 - (column - i))
    + terrain.samples[start + terrain.columns + 1]!.h * (column - i);
  return near * (1 - (row - j)) + far * (row - j);
}

export function sampleAt(terrain: Terrain, { x, d }: WorldPoint): TerrainSample | undefined {
  if (x < terrain.domain.minX || x > terrain.domain.maxX || d < 0 || d > terrain.domain.maxDepth) return undefined;
  return terrain.samples[Math.round(d / terrain.step) * terrain.columns
    + Math.round((x - terrain.domain.minX) / terrain.step)];
}
