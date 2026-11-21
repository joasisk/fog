import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  GEOMETRY_CASES,
  GEOMETRY_FIXTURE_MANIFEST,
  GEOMETRY_FIXTURES,
  generateWorldGeometry,
  heightAt,
  reachableRoadNodes,
  renderGeometryDebug,
  sampleAt,
} from "../src/generation/index.ts";
import { MAX_LANE_GRADE_DEGREES, gradeBetween, peakTerrainGrade, routingNeighbors } from "../src/generation/routing.ts";
import { capacityShortfalls } from "../src/generation/settlement.ts";

for (const [name, recipe] of Object.entries(GEOMETRY_CASES)) {
  test(`${name} produces repeatable terrain, tier, graph and debug views`, () => {
    const first = generateWorldGeometry(recipe);
    const second = generateWorldGeometry(recipe);
    assert.equal(first.ok, true);
    assert.deepEqual(first, second);
    assert.equal(first.tier, recipe.requestedTier);
    assert.deepEqual(capacityShortfalls(first.terrainCapacity, first.tier), []);
    assert.deepEqual(capacityShortfalls(first.roadCapacity, first.tier), []);

    const otherSeed = generateWorldGeometry({ ...recipe, seed: "another terrain seed" });
    assert.notDeepEqual(first.terrain.profiles, otherSeed.terrain.profiles);

    for (const view of ["terrain", "exclusions", "grades", "connectivity"]) {
      const svg = renderGeometryDebug(first, view);
      assert.match(svg, /^<svg .*<title>/);
      assert.equal(svg, renderGeometryDebug(second, view));
    }
    assert.equal(first.terrain.crossings.length, 0);
    assert.ok(first.terrain.exclusions.length > 0);
    assert.ok(first.terrain.buildableRegions.length > 0);
    const [a, b] = first.terrain.profiles[0].surface;
    assert.equal(heightAt(first.terrain, a), a.h);
    assert.equal(heightAt(first.terrain, { x: (a.x + b.x) / 2, d: a.d }), (a.h + b.h) / 2);
    assert.equal(heightAt(first.terrain, { x: a.x - 1, d: a.d }), undefined);
  });

  test(`${name} connects all junctions to both exits with supported lane grades`, () => {
    const world = generateWorldGeometry(recipe);
    assert.equal(world.ok, true);
    const { roads, terrain } = world;
    const exits = roads.nodes.filter(({ approachId }) => approachId);
    assert.equal(exits.length, 2);
    assert.deepEqual(new Set(exits.map(({ approachId }) => approachId)),
      new Set(terrain.approaches.map(({ id }) => id)));
    const nodes = new Map(roads.nodes.map((node) => [node.id, node]));
    assert.equal(nodes.size, roads.nodes.length);
    assert.equal(new Set(roads.edges.map(({ id }) => id)).size, roads.edges.length);
    for (const exit of exits) assert.equal(reachableRoadNodes(roads, exit.id).size, nodes.size);

    for (const edge of roads.edges) {
      assert.notEqual(edge.from, edge.to);
      assert.deepEqual(edge.centerline[0], nodes.get(edge.from)?.position);
      assert.deepEqual(edge.centerline.at(-1), nodes.get(edge.to)?.position);
      assert.equal(edge.gradesDegrees.length, edge.centerline.length - 1);
      assert.ok(edge.gradesDegrees.every((grade) => Math.abs(grade) <= MAX_LANE_GRADE_DEGREES));
      assert.ok(edge.walkingDistance > 0);
      assert.ok(edge.width > edge.apparentReveal);
      for (let i = 1; i < edge.centerline.length; i++) {
        const a = edge.centerline[i - 1];
        const b = edge.centerline[i];
        let previous = a;
        for (const t of [0.25, 0.5, 0.75, 1]) {
          const x = a.x + (b.x - a.x) * t;
          const d = a.d + (b.d - a.d) * t;
          const point = { x, d, h: heightAt(terrain, { x, d }) };
          assert.equal(sampleAt(terrain, point).exclusion, null);
          assert.ok(Math.abs(gradeBetween(previous, point)) <= MAX_LANE_GRADE_DEGREES);
          previous = point;
        }
      }
      for (const span of edge.frontage) {
        assert.ok(span.start > 0);
        assert.ok(span.start < span.end);
        assert.ok(span.end < edge.walkingDistance);
      }
    }
    const routes = new Set(roads.edges.map(({ route }) => route));
    assert.deepEqual(routes, name === "foothillTown" ? new Set(["spine", "branch", "connector"]) : new Set(["spine"]));
  });
}

test("terrain rejects an unsupported tier and preserves the terrain across explicit fallback", () => {
  const recipe = { ...GEOMETRY_CASES.contourFarmLane, requestedTier: "town" };
  const rejected = generateWorldGeometry(recipe);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.diagnostics.length, 1);
  assert.equal(rejected.diagnostics[0].stage, "terrain");
  assert.match(rejected.diagnostics[0].shortfalls.join("\n"), /usable depth bands/);

  const fallback = generateWorldGeometry({ ...recipe, allowSmallerTier: true });
  assert.equal(fallback.ok, true);
  assert.equal(fallback.tier, "farm-lane");
  assert.deepEqual(fallback.terrain, rejected.terrain);
  assert.deepEqual(fallback.diagnostics.map(({ tier }) => tier), ["town", "village", "hamlet"]);
  assert.deepEqual(fallback.roads, generateWorldGeometry(GEOMETRY_CASES.contourFarmLane).roads);
});

test("automatic tier selection chooses a seeded feasible graph", () => {
  const { requestedTier: _, ...recipe } = GEOMETRY_CASES.foothillTown;
  const world = generateWorldGeometry(recipe);
  assert.equal(world.ok, true);
  assert.deepEqual(capacityShortfalls(world.roadCapacity, world.tier), []);
  assert.deepEqual(world, generateWorldGeometry(recipe));
});

test("the farm lane tracks the buildable shelf as it bends across the panorama", () => {
  const paths = ["9106", "23"].map((seed) => {
    const world = generateWorldGeometry({ ...GEOMETRY_CASES.contourFarmLane, seed });
    assert.equal(world.ok, true);
    const { columns, rows, samples, step, domain } = world.terrain;
    const line = world.roads.edges[0].centerline;
    for (const { x, d } of line) {
      const col = Math.round((x - domain.minX) / step);
      let near = Math.round(d / step);
      let far = near;
      assert.ok(samples[near * columns + col].buildable);
      while (near > 0 && samples[(near - 1) * columns + col].buildable) near--;
      while (far + 1 < rows && samples[(far + 1) * columns + col].buildable) far++;
      assert.ok(Math.abs(d - (near + far) / 2 * step) <= step);
    }
    assert.ok(new Set(line.map(({ d }) => d)).size > 1);
    return line.map(({ x, d }) => [x, d]);
  });
  assert.notDeepEqual(paths[0], paths[1]);
});

test("the lane grade limit holds between elevation samples on a diagonal", () => {
  // The interior cell rises as h(t) = 0.104 t² along the diagonal.
  const samples = Array.from({ length: 16 }, (_, id) => ({
    id, x: id % 4, d: Math.floor(id / 4), h: id === 10 ? 0.104 : 0, slopeDegrees: 6, exclusion: null,
  }));
  const terrain = { columns: 4, rows: 4, step: 1, domain: { minX: 0, maxX: 3, maxDepth: 3 }, samples };
  const a = samples[5], b = samples[10];
  const expected = Math.atan(2 * b.h / Math.SQRT2) * 180 / Math.PI;
  assert.ok(gradeBetween(a, b) < MAX_LANE_GRADE_DEGREES && expected > MAX_LANE_GRADE_DEGREES);
  assert.ok(Math.abs(peakTerrainGrade(terrain, a, b) - expected) < 1e-10);
  assert.ok(Math.abs(peakTerrainGrade(terrain, b, a) + expected) < 1e-10);
  assert.ok(!routingNeighbors(terrain, a.id).includes(b.id));
  assert.ok(!routingNeighbors(terrain, b.id).includes(a.id));
});

test("supplementary Unicode characters contribute their full value to the terrain seed", () => {
  const recipe = GEOMETRY_CASES.foothillTown;
  const sunrise = generateWorldGeometry({ ...recipe, seed: "🌄" });
  const horizon = generateWorldGeometry({ ...recipe, seed: "🌅" });
  assert.notDeepEqual(sunrise.terrain.profiles, horizon.terrain.profiles);
});

test("the four geometry envelopes serialize in the shared v1 authoring format", () => {
  const source = new URL("../Town-Soundscape-Handoff-v1/examples/asset-manifest.example.json", import.meta.url);
  const example = JSON.parse(readFileSync(source, "utf8"));
  const manifest = JSON.parse(JSON.stringify(GEOMETRY_FIXTURE_MANIFEST));
  assert.equal(manifest.schema_version, example.schema_version);
  assert.deepEqual(manifest.units, example.units);
  const { attached, detached, stepped, civic } = GEOMETRY_FIXTURES.assets;
  assert.deepEqual(manifest.assets, [attached, detached, stepped, civic]);
  assert.equal(new Set(manifest.assets.map(({ asset_id }) => asset_id)).size, 4);
  for (const asset of manifest.assets) {
    const xs = asset.footprint_f.map(([x]) => x);
    assert.equal(Math.max(...xs) - Math.min(...xs), asset.world_width_f);
    const [width, height] = asset.source_dimensions_px;
    const [x, y, w, h] = asset.trim_rect_px;
    assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= width && y + h <= height);
    for (const [u, v] of [asset.pivot_uv, asset.sockets.entrance.uv]) {
      assert.ok(u >= 0 && u <= 1 && v >= 0 && v <= 1);
    }
    assert.ok(asset.sockets.entrance.accepts.length > 0 && asset.foundation_modes.length > 0);
  }
});
