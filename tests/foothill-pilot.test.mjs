import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { heightAt } from "../src/generation/terrain.ts";
import { importPacks } from "../src/townscape/assets.ts";
import { projectPoint } from "../src/townscape/fixture.ts";
import { replaceFoothill, resolveFoothill } from "../src/townscape/foothill.ts";

const root = new URL("https://example.test/fog/assets/townscape/");
const source = new URL("batch-02/hillside.v1.json", root);
const inventory = importPacks(new Map(["01", "02"].map(batch => {
  const path = `batch-${batch}/manifest.v1.json`;
  return [new URL(path, root), JSON.parse(readFileSync(new URL(`../assets/townscape/${path}`, import.meta.url)))];
})));
const open = seed => resolveFoothill(seed, inventory, source);
const replace = (scene, scope, seed = "") => replaceFoothill(scene, scope, seed, inventory, source);

test("foothill repeats the accepted layout and projection and supports every shell to a reachable frontage", () => {
  const first = open("7419");
  assert.deepEqual(open("7419"), first);
  const second = open("7430");
  assert.notDeepEqual(first.world.terrain, second.world.terrain);
  assert.notDeepEqual(first.hillside.roads, second.hillside.roads);
  for (const scene of [first, second]) {
    assert.equal(scene.world.tier, "town");
    assert.equal(scene.buildings.length, scene.world.layout.buildings.length);
    assert.equal(scene.hillside.bands.filter(band => band.mist).length, 2);
    assert.ok(scene.hillside.bands.every(band => band.roads.length > 0));
    assert.ok(scene.lots.some(lot => lot.use === "playground"));
    for (const b of scene.buildings) {
      assert.ok(b.floor >= b.support.high - 1e-7);
      assert.ok(b.pads.every(pad => pad.base <= pad.floor));
      assert.ok(b.footprint.every(p => heightAt(scene.world.terrain, p) <= b.floor + 1e-7));
      for (let i = 1; i < b.pads.length; i++) {
        assert.deepEqual(b.pads[i - 1].outline[1], b.pads[i].outline[0]);
      }
      const feet = b.sprite.art.ground.map(p => projectPoint(b.sprite, p));
      assert.ok(Math.abs(feet[0][0] - b.pads[0].outline[0][0]) < 1e-7);
      assert.ok(Math.abs(feet[1][0] - b.pads.at(-1).outline[1][0]) < 1e-7);
      assert.deepEqual(b.entrance.path[0], projectPoint(b.sprite, b.sprite.art.entrancePx));
      assert.ok(scene.hillside.roads.some(road => road.id === b.edgeId));
    }
    for (const emitter of scene.soundscape.emitters) {
      if (emitter.source.kind === "building") {
        const b = scene.buildings.find(entry => entry.id === emitter.source.buildingId);
        assert.deepEqual([emitter.motion.position.x, emitter.motion.position.y], b.sound);
      }
    }
  }
});

for (const [seed, joins] of [["7419", 1], ["7430", 2]]) {
  test(`seed ${seed} replaces both shops across ${joins} shared wall joins`, () => {
    const scene = open(seed);
    const other = replace(scene, "building");
    assert.equal(other.slot.id, scene.slot.id);
    assert.notEqual(other.slot.use, scene.slot.use);
    assert.equal(other.slot.sharedWalls.length, joins);
    assert.equal(other.slot.sprite.exposed.length, 2 - joins);
    assert.deepEqual(other.slot.entrance, scene.slot.entrance);
    assert.deepEqual(other.slot.pads, scene.slot.pads);
    assert.deepEqual(other.hillside.roads, scene.hillside.roads);
    assert.deepEqual(replace(other, "building"), scene);
  });
}

test("street replacement retains its junctions, geometry and neighboring frontage", () => {
  const scene = open("7419");
  const edge = scene.slot.edgeId;
  const next = replace(scene, edge);
  assert.equal(next.world, scene.world);
  assert.deepEqual(next.lots, scene.lots);
  assert.deepEqual(next.hillside.junctions, scene.hillside.junctions);
  const road = next.hillside.roads.find(road => road.id === edge);
  const old = scene.hillside.roads.find(road => road.id === edge);
  assert.notEqual(road.surface, old.surface);
  assert.deepEqual(road.path, old.path);
  assert.deepEqual(next.buildings.filter(b => b.edgeId !== edge), scene.buildings.filter(b => b.edgeId !== edge));
  assert.deepEqual(replace(next, "town", "7431"), open("7431"));
});

test("a candidate with a missing shop or incompatible wall leaves the valid scene usable", () => {
  const scene = open("7430");
  const broken = new Map(inventory);
  const id = scene.slot.use === "bookshop" ? "townscape.b01.cafe" : "townscape.b01.bookshop";
  const art = broken.get(id);
  broken.set(id, { ...art, wall_contacts: { ...art.wall_contacts, left: { ...art.wall_contacts.left, profile: "invalid" } } });
  assert.throws(() => replaceFoothill(scene, "building", "", broken, source), /shared contacts/);
  broken.delete(id);
  assert.throws(() => replaceFoothill(scene, "building", "", broken, source), /no shell fits/);
  assert.deepEqual(scene, open("7430"));
});
