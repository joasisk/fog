import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { RegenerationScope } from "../src/model/regeneration.ts";
import { catalogUrls, validateDesign } from "../src/pilot/building-catalog.ts";
import { elevationTransform } from "../src/pilot/building-placement.ts";
import { hitTarget, regenerate } from "../src/pilot/regenerate.ts";
import { createPilot, marketStreet, shopSite } from "../src/pilot/scene.ts";

const root = new URL("../assets/building-catalog/", import.meta.url);
const index = JSON.parse(await readFile(new URL("catalog.json", root), "utf8"));
const catalog = await Promise.all(index.buildings.filter(({ type, profile }) =>
  (profile === "old-town" && ["cafe", "bookshop", "terraced-house"].includes(type)) ||
  (profile === "garden" && type === "detached-house")).map(async (entry) =>
  validateDesign(entry, JSON.parse(await readFile(new URL(entry.design, root), "utf8")))));

const getBuilding = (scene, id) => scene.town.buildings.find(({ siteId }) => siteId === id);
const getDesign = (building) => catalog.find(({ id }) => id === building.designId);

test("asset URLs stay under the catalog and invalid records are rejected", () => {
  for (const base of ["/", "/fog/"]) {
    const url = catalogUrls(base, "https://example.test/fog/");
    assert.equal(url("catalog.json").pathname, base + "assets/building-catalog/catalog.json");
    assert.throws(() => url("../catalog.json"), /Invalid catalog path/);
  }
  const resolve = catalogUrls("./", "https://example.test/fog/");
  assert.equal(resolve("catalog.json").pathname, "/fog/assets/building-catalog/catalog.json");

  const indexEntry = index.buildings.find(({ id }) => id === catalog[0].id);
  const design = catalog[0];
  assert.throws(() => validateDesign(indexEntry, { ...design, framePx: [0, 0] }), /Invalid building design/);
  const [window, ...rest] = design.windows;
  assert.throws(() => validateDesign(indexEntry, {
    ...design, windows: [{ ...window, roomId: "missing-room" }, ...rest],
  }), /Invalid building design/);
});

test("shop replacement joins at the original baseline and updates its entrance and emitter", () => {
  const initial = createPilot(7231, catalog);
  const before = getBuilding(initial, shopSite);
  const target = { scope: RegenerationScope.Building, siteId: shopSite };
  const { scene, bounds } = regenerate(initial, target, 42, catalog);
  const after = getBuilding(scene, shopSite);
  const neighbor = getBuilding(scene, "site:house");
  assert.equal(after.designId, "buildings/bookshop/old-town/v01");
  assert.equal(after.footprint, before.footprint);
  assert.deepEqual(after.uses.slice(1), before.uses.slice(1));
  for (const building of [before, after]) {
    const design = getDesign(building);
    const transform = elevationTransform(design, building);
    const right = transform.point([design.wallContactXPx.right, design.groundAnchorPx[1]]);
    assert.equal(right.x, Math.min(...neighbor.footprint.map(({ x }) => x)));
    assert.equal(right.y, neighbor.position.y);
    assert.deepEqual(hitTarget(scene, { x: building.position.x, y: 340 }), target);
    for (const point of building.silhouette) {
      assert(point.x >= bounds.min.x && point.x <= bounds.max.x);
      assert(point.y >= bounds.min.y && point.y <= bounds.max.y);
    }
  }
  const design = getDesign(after);
  const transform = elevationTransform(design, after);
  const site = scene.town.sites.find(({ id }) => id === shopSite);
  assert.deepEqual(site.entrance.position, transform.point(design.entrances[0].positionPx));
  assert(after.height <= site.limits.maxHeight);
  const emitter = scene.soundscape.emitters.find(({ id }) => id === "emitter:shop-door");
  const anchor = design.soundAnchors.find(({ placement }) => placement === "indoor");
  assert.deepEqual(emitter.motion.position, transform.point(anchor.positionPx));
  assert.equal(emitter.source.useId, after.uses[0].id);
  assert.equal(scene.soundscape.rain, initial.soundscape.rain);
});

test("catalog placement and street swaps are repeatable and leave gaps beside the cottage", () => {
  for (let i = 0; i < 24; i++) {
    const seed = Math.imul(i, 2654435761) >>> 0;
    const scene = createPilot(seed, catalog);
    assert.deepEqual(scene, createPilot(seed, [...catalog].reverse()));
    const cottage = getBuilding(scene, "site:garden-house");
    const lot = scene.town.lots.find(({ id }) => id === "lot:garden-house");
    const site = scene.town.sites.find(({ id }) => id === cottage.siteId);
    const gap = getDesign(cottage).sideClearanceUnits * 9;
    assert(Math.min(...cottage.footprint.map(({ x }) => x)) - lot.interval.start >= gap);
    assert(lot.interval.end - Math.max(...cottage.footprint.map(({ x }) => x)) >= gap);
    assert(site.setback / 9 >= getDesign(cottage).setbackRangeUnits.min);
    assert(site.setback / 9 <= getDesign(cottage).setbackRangeUnits.max);
    const cottageTarget = { scope: RegenerationScope.Building, siteId: cottage.siteId };
    const alternate = regenerate(scene, cottageTarget, seed, catalog);
    assert.notEqual(getBuilding(alternate.scene, cottage.siteId).designId, cottage.designId);
    const streetTarget = { scope: RegenerationScope.Street, streetId: marketStreet };
    const streetSwap = regenerate(scene, streetTarget, seed + 1, catalog);
    assert.equal(getBuilding(streetSwap.scene, cottage.siteId), cottage);
  }
});
