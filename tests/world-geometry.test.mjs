import assert from "node:assert/strict";
import test from "node:test";
import {
  GEOMETRY_CASES,
  generateWorldGeometry,
  heightAt,
  reachableRoadNodes,
  renderGeometryDebug,
  sampleAt,
} from "../src/generation/index.ts";
import { MAX_LANE_GRADE_DEGREES, gradeBetween } from "../src/generation/routing.ts";
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
