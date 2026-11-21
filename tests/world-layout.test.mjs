import assert from "node:assert/strict";
import test from "node:test";
import {
  LAYOUT_CASES, generateWorldGeometry, generateWorldLayout, heightAt, layoutOnRoads, renderLayoutDebug, sampleAt,
} from "../src/generation/index.ts";

const town = LAYOUT_CASES.foothillTown;
const rural = LAYOUT_CASES.contourFarmLane;
const accepted = (recipe) => {
  const w = generateWorldLayout(recipe);
  assert.equal(w.ok, true, JSON.stringify(w.diagnostics));
  return w;
};
const close = (a, b, epsilon = 1e-7) => assert.ok(Math.abs(a - b) < epsilon, `${a} differs from ${b}`);
const pointDistance = (a, b) => Math.hypot(a.x - b.x, a.d - b.d);

function inside(p, polygon) {
  const cross = polygon.map((a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    return (b.x - a.x) * (p.d - a.d) - (b.d - a.d) * (p.x - a.x);
  });
  return cross.every((v) => v >= -1e-8) || cross.every((v) => v <= 1e-8);
}
function overlaps(a, b) {
  for (const poly of [a, b]) {
    for (let i = 0; i < 2; i++) {
      const p = poly[i], q = poly[i + 1];
      const project = (v) => v.x * (q.d - p.d) - v.d * (q.x - p.x);
      const aa = a.map(project), bb = b.map(project);
      if (Math.min(...aa) >= Math.max(...bb) - 1e-8 || Math.min(...bb) >= Math.max(...aa) - 1e-8) return false;
    }
  }
  return true;
}

// Independently integrate the centerline to the stored gate/door connection.
function distanceOnEdge(edge, terrain, target) {
  let length = 0;
  for (let i = 1; i < edge.centerline.length; i++) {
    const a = edge.centerline[i - 1], b = edge.centerline[i];
    const dx = b.x - a.x, dd = b.d - a.d, run = Math.hypot(dx, dd);
    const t = ((target.x - a.x) * dx + (target.d - a.d) * dd) / run ** 2;
    const onLink = t >= -1e-8 && t <= 1 + 1e-8 && pointDistance(target, { x: a.x + dx * t, d: a.d + dd * t }) < 1e-7;
    const end = onLink ? Math.max(0, Math.min(1, t)) : 1;
    let prev = a.h;
    for (let j = 1; j <= 8; j++) {
      const k = end * j / 8, h = heightAt(terrain, { x: a.x + k * dx, d: a.d + k * dd });
      length += Math.hypot(end * run / 8, h - prev);
      prev = h;
    }
    if (onLink) return length;
  }
  assert.fail("Entrance misses its road");
}

for (const [tier, recipe, min, max, bands] of [
  ["farmstead", { ...rural, requestedTier: "farmstead" }, 1, 4, 1], ["farm-lane", rural, 5, 10, 1],
  ["hamlet", { ...town, requestedTier: "hamlet" }, 7, 18, 2], ["village", { ...town, requestedTier: "village" }, 18, 40, 2],
  ["town", town, 35, 85, 3], ["city", LAYOUT_CASES.broadFoothillCity, 160, 320, 6],
]) {
  test(`${tier} parcels accepted frontage with reachable, supported fixture buildings`, () => {
    const { layout, terrain, roads } = accepted(recipe);
    const { buildings, lots, frontages, sites } = layout;
    assert.ok(buildings.length >= min && buildings.length <= max);
    assert.equal(new Set(lots.filter((l) => l.envelope).map((l) => l.band)).size, bands);
    const byId = new Map(lots.map((l) => [l.id, l]));
    assert.equal(lots.length, byId.size);
    assert.equal(sites.flatMap((s) => s.lotIds).length, lots.length);
    const paving = roads.edges.flatMap((edge) => edge.centerline.slice(1).map((b, i) => {
      const a = edge.centerline[i], half = edge.width / (2 * pointDistance(a, b));
      const x = (b.d - a.d) * half, d = (a.x - b.x) * half;
      return [{ x: a.x + x, d: a.d + d }, { x: b.x + x, d: b.d + d },
        { x: b.x - x, d: b.d - d }, { x: a.x - x, d: a.d - d }];
    }));
    for (const lot of lots) {
      const f = frontages.find((f) => f.id === lot.frontageSectionId);
      assert.ok(f.start <= lot.interval.start + 1e-7 && lot.interval.start < lot.interval.end && lot.interval.end <= f.end + 1e-7);
      assert.ok(sites.find((s) => s.id === lot.siteId).lotIds.includes(lot.id));
      const edge = roads.edges.find((e) => e.id === f.edgeId);
      assert.equal(lot.entrance.edgeId, edge.id);
      assert.ok(lot.entrance.distance >= lot.interval.start && lot.entrance.distance <= lot.interval.end);
      close(distanceOnEdge(edge, terrain, lot.entrance.roadPoint), lot.entrance.distance, 0.001);
      assert.ok(inside(lot.entrance.threshold, lot.outline));
      for (const p of lot.outline) assert.ok(sampleAt(terrain, p)?.buildable);
      assert.ok(!paving.some((road) => overlaps(road, lot.outline)), "Lot intrudes onto paving");
      const [a, b, , d] = lot.outline;
      for (let u = 0; u <= 1; u += 0.125) for (let v = 0; v <= 1; v += 0.125) {
        assert.ok(sampleAt(terrain, { x: a.x + (b.x - a.x) * u + (d.x - a.x) * v,
          d: a.d + (b.d - a.d) * u + (d.d - a.d) * v })?.buildable);
      }
    }
    for (let i = 0; i < lots.length; i++) {
      for (const other of lots.slice(i + 1)) assert.ok(!overlaps(lots[i].outline, other.outline), `${lots[i].id} intersects ${other.id}`);
    }
    for (const b of buildings) {
      const lot = byId.get(b.lotId);
      assert.equal(lot.siteId, b.siteId);
      assert.ok(b.height > 0 && b.height <= lot.envelope.maxHeight);
      assert.deepEqual(lot.entrance, b.entrance);
      close(b.root.h, b.foundation.high);
      for (const point of b.footprint) {
        assert.ok(inside(point, lot.envelope.footprint) && inside(point, lot.outline));
        const h = heightAt(terrain, point);
        assert.ok(b.foundation.low <= h + 1e-7 && h <= b.root.h + 1e-7);
      }
      for (const pad of b.foundation.supports) {
        close(pad.floorHeight, b.root.h);
        for (const p of pad.footprint) assert.ok(pad.baseHeight <= heightAt(terrain, p) + 1e-7 && inside(p, b.footprint));
      }
      for (const id of b.sharedWalls) {
        const neighbor = buildings.find((n) => n.id === id);
        assert.ok(neighbor.sharedWalls.includes(b.id));
        assert.ok(b.footprint.filter((p) => neighbor.footprint.some((q) => pointDistance(p, q) < 1e-7)).length >= 2);
        assert.ok(lot.envelope.wallContacts.length > 0);
      }
    }
    if (tier === "city") {
      assert.ok(roads.edges.length >= roads.nodes.length);
      assert.equal(layout.secondaryCenters.length, 1);
    }
  });
}

test("districts grow a connected historic quarter and the transition tapers in front and rear bands", () => {
  const world = accepted(town), { layout } = world;
  const center = layout.sites.find((s) => s.id === layout.center.siteId);
  const core = layout.districts.filter((s) => s.historic);
  const focus = core.find((s) => s.edgeId === center.entrance.edgeId && s.start <= center.entrance.distance && center.entrance.distance <= s.end);
  assert.equal(focus.district, "civic");
  const endpoints = (s) => {
    const edge = world.roads.edges.find((e) => e.id === s.edgeId);
    return [s.start === 0 ? edge.from : s.edgeId + "/" + s.start,
      s.end === edge.walkingDistance ? edge.to : s.edgeId + "/" + s.end];
  };
  const reached = new Set([focus]);
  for (const s of reached) for (const t of core) if (endpoints(s).some((id) => endpoints(t).includes(id))) reached.add(t);
  assert.equal(reached.size, core.length);
  const built = new Map(layout.buildings.map((b) => [b.lotId, b]));
  for (const band of [0, 2]) {
    const inBand = layout.lots.filter((l) => l.band === band);
    const left = inBand.filter((l) => l.entrance.roadPoint.x < 0);
    const right = inBand.filter((l) => l.entrance.roadPoint.x >= 0);
    assert.ok(left.filter((l) => built.has(l.id)).length / left.length > right.filter((l) => built.has(l.id)).length / right.length);
    const contacts = (ls) => ls.filter((l) => built.get(l.id)?.sharedWalls.length).length;
    assert.ok(contacts(left) > contacts(right));
    assert.ok(right.some((l) => ["orchard", "field", "garden"].includes(l.use)));
    assert.ok(right.some((l) => built.has(l.id)));
  }
  assert.ok(layout.buildings.some((b) => b.foundation.mode === "stepped_plinth" && b.foundation.supports.length > 1));
  assert.ok(layout.buildings.some((b) => b.assetId === "townscape.b01.cafe" || b.assetId === "townscape.b01.bookshop"));
});

test("school and play share frontage, stops use through roads, and capacities cover every household", () => {
  const world = accepted(LAYOUT_CASES.broadFoothillCity);
  const { lots, sites, services } = world.layout;
  const homes = lots.filter((l) => l.use === "house");
  for (const service of services) {
    const group = sites.find((s) => s.id === service.siteId).lotIds.map((id) => lots.find((l) => l.id === id));
    if (service.use === "school") {
      const [school, play] = group;
      assert.equal(school.use, "school"); assert.equal(play.use, "playground");
      assert.equal(school.frontageSectionId, play.frontageSectionId);
      close(school.interval.end, play.interval.start);
    }
    if (service.use === "bus_stop") {
      assert.equal(world.roads.edges.find((e) => e.id === group[0].entrance.edgeId).route, "spine");
    }
    assert.ok(service.households.length <= service.capacity);
    // Relax graph distances from the service entrance, independently of the generator's all-pairs table.
    const street = world.roads.edges.find((e) => e.id === service.entrance.edgeId);
    const distances = new Map(world.roads.nodes.map((n) => [n.id, Infinity]));
    distances.set(street.from, service.entrance.distance);
    distances.set(street.to, street.walkingDistance - service.entrance.distance);
    for (let i = 1; i < distances.size; i++) {
      for (const e of world.roads.edges) {
        distances.set(e.from, Math.min(distances.get(e.from), distances.get(e.to) + e.walkingDistance));
        distances.set(e.to, Math.min(distances.get(e.to), distances.get(e.from) + e.walkingDistance));
      }
    }
    for (const h of service.households) {
      const door = homes.find((l) => l.id === h.lotId).entrance;
      const e = world.roads.edges.find((e) => e.id === door.edgeId);
      const network = Math.min(distances.get(e.from) + door.distance,
        distances.get(e.to) + e.walkingDistance - door.distance,
        street.id === e.id ? Math.abs(service.entrance.distance - door.distance) : Infinity);
      close(h.distance, network + door.distanceToRoad + service.entrance.distanceToRoad);
      assert.ok(h.distance <= service.maximumDistance);
    }
  }
  for (const use of ["park", "bus_stop", "school"]) {
    const served = services.filter((s) => s.use === use).flatMap((s) => s.households.map((h) => h.lotId));
    assert.deepEqual(served.sort(), homes.map((l) => l.id).sort());
  }
});

test("layout is repeatable on a serialized accepted graph and required reservations can fail locally", () => {
  const world = generateWorldGeometry(town);
  const snapshot = JSON.stringify(world);
  const result = layoutOnRoads(world);
  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(world), snapshot);
  assert.deepEqual(result, layoutOnRoads(JSON.parse(snapshot)));
  assert.deepEqual(result.layout, accepted(town).layout);
  const input = JSON.parse(snapshot);
  for (const edge of input.roads.edges) edge.frontage = edge.frontage.filter((f) => f.support !== "civic");
  const failed = layoutOnRoads(input);
  assert.equal(failed.ok, false); assert.match(failed.shortfalls.join(" "), /school/);
  for (const view of ["districts", "parcels", "massing"]) {
    assert.equal(renderLayoutDebug({ ...world, layout: result.layout }, view), renderLayoutDebug(accepted(town), view));
  }
});

test("constrained terrain and measured parcel shortfalls preserve terrain on explicit fallback", () => {
  for (const [recipe, stage, expected] of [
    [{ ...rural, requestedTier: "town" }, "terrain", "farm-lane"],
    [{ ...LAYOUT_CASES.broadFoothillCity, seed: "5", morphology: "transition" }, "layout", "town"],
  ]) {
    const failed = generateWorldLayout(recipe);
    assert.equal(failed.ok, false); assert.equal(failed.diagnostics[0].stage, stage);
    const fallback = accepted({ ...recipe, allowSmallerTier: true });
    assert.equal(fallback.tier, expected); assert.deepEqual(fallback.terrain, failed.terrain);
    assert.deepEqual(fallback.roads, generateWorldGeometry({ ...recipe, requestedTier: expected }).roads);
  }
});
