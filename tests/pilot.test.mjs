import assert from "node:assert/strict";
import test from "node:test";
import { RegenerationScope } from "../src/model/regeneration.ts";
import { createPilot, marketStreet, shopSite } from "../src/pilot/scene.ts";
import { gardenStreet } from "../src/pilot/residential.ts";
import { hitTarget, regenerate } from "../src/pilot/regenerate.ts";

const target = (scope, id) => scope === RegenerationScope.Building ? { scope, siteId: id } : { scope, streetId: id };
const street = (scene, id) => scene.town.network.streets.find((street) => street.id === id);
const building = (scene, id) => scene.town.buildings.find((building) => building.siteId === id);

test("seeded towns reproduce their geometry and sound sources", () => {
  assert.deepEqual(createPilot(1729), createPilot(1729));
  assert.notDeepEqual(createPilot(1729).town.terrain, createPilot(42).town.terrain);
});

test("hit testing selects exposed buildings, both roads and sky", () => {
  const scene = createPilot();
  assert.deepEqual(hitTarget(scene, { x: 510, y: 322 }), target(RegenerationScope.Building, shopSite));
  assert.deepEqual(hitTarget(scene, { x: 510, y: 412 }), target(RegenerationScope.Street, marketStreet));
  assert.deepEqual(hitTarget(scene, { x: 60, y: 321 }), target(RegenerationScope.Street, gardenStreet));
  assert.deepEqual(hitTarget(scene, { x: 880, y: 75 }), { scope: RegenerationScope.Town });
  assert.equal(hitTarget(scene, { x: 950, y: 510 }), undefined);
});

test("a shop swap retains the footprint, flats, streets and unrelated sound sources", () => {
  const original = createPilot();
  const swapped = regenerate(original, target(RegenerationScope.Building, shopSite), 42).scene;
  const before = building(original, shopSite);
  const after = building(swapped, shopSite);
  assert.equal(after.footprint, before.footprint);
  assert.equal(after.uses[1], before.uses[1]);
  assert.equal(after.uses[0].kind, "bookshop");
  assert.equal(swapped.town.network, original.town.network);
  assert.equal(swapped.soundscape.rain, original.soundscape.rain);
  assert.notEqual(swapped.soundscape.emitters[0], original.soundscape.emitters[0]);
  assert.deepEqual(swapped.soundscape.emitters.slice(1), original.soundscape.emitters.slice(1));
  for (const [index, emitter] of original.soundscape.emitters.slice(1).entries()) {
    assert.equal(swapped.soundscape.emitters[index + 1], emitter);
  }
});

test("street replacement preserves junctions, neighbor frontage and shared wall contacts across seeds", () => {
  const original = createPilot();
  for (let index = 0; index < 96; index++) {
    const seed = Math.imul(index, 2654435761) >>> 0;
    for (const [selected, other] of [[marketStreet, gardenStreet], [gardenStreet, marketStreet]]) {
      const { scene } = regenerate(original, target(RegenerationScope.Street, selected), seed);
      assert.equal(scene.town.network.junctions, original.town.network.junctions);
      assert.equal(street(scene, other), street(original, other));
      assert.notEqual(street(scene, selected), street(original, selected));
      const segment = street(scene, selected).segments[0];
      for (const [id, end] of [[segment.from, 0], [segment.to, -1]]) {
        assert.deepEqual(segment.centerline.at(end), scene.town.network.junctions.find((junction) => junction.id === id).position);
      }
      assert.equal(scene.soundscape.rain, original.soundscape.rain);
      assert.equal(Math.max(...building(scene, shopSite).footprint.map(({ x }) => x)),
        Math.min(...building(scene, "site:house").footprint.map(({ x }) => x)));
    }
  }
});

test("town replacement applies the requested seed and covers the whole scene", () => {
  const original = createPilot();
  const replacement = regenerate(original, { scope: RegenerationScope.Town }, 42);
  assert.deepEqual(replacement.scene, createPilot(42));
  assert.equal(replacement.bounds, original.town.bounds);
});
