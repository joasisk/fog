import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { importPacks, toPixels } from "../src/townscape/assets.ts";
import { projectPoint, resolveHillside } from "../src/townscape/fixture.ts";

const deployedRoot = new URL("https://example.test/under/fog/assets/townscape/");
const repositoryRoot = new URL("../assets/townscape/", import.meta.url);
const fixtureUrl = new URL("batch-02/hillside.v1.json", deployedRoot);
const json = (path) => JSON.parse(readFileSync(new URL(path, repositoryRoot), "utf8"));
const packs = () => new Map(["batch-01", "batch-02"].map((batch) => {
  const path = `${batch}/manifest.v1.json`;
  return [new URL(path, deployedRoot), json(path)];
}));
const fixture = () => json("batch-02/hillside.v1.json");
const importHillside = (layout, catalog = importPacks(packs())) => resolveHillside(layout, catalog, fixtureUrl);

test("the nested deployment imports all 14 distinct shell IDs and the mounted component records", () => {
  const inventory = importPacks(packs());
  const shells = [...inventory.values()].filter((asset) => asset.family === "shell");
  assert.equal(shells.length, 14);
  const counts = new Map();
  for (const shell of shells) {
    const kind = shell.shell_group ?? (Object.keys(shell.wall_contacts).length ? "attached_historic" : "detached");
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
    const wall = shell.hrefs.get("wall");
    assert.equal(wall.origin, deployedRoot.origin);
    assert.ok(wall.pathname.startsWith(deployedRoot.pathname));
  }
  assert.deepEqual(Object.fromEntries(counts), {
    attached_historic: 6, detached: 3, modern: 2, barn: 1, school: 1, inn: 1,
  });
});

test("the same resolved fixture grounds both shops, joins stairs and splits the tall tree across mist", () => {
  const data = fixture();
  const scene = importHillside(data);
  assert.deepEqual(scene.bands.map((band) => [band.id, band.q, band.packets.structures.length]), [
    ["far", .53, 9], ["middle", .76, 7], ["near", 1, 8],
  ]);
  assert.equal(scene.roads.filter((route) => route.kind === "stairs").length, 3);
  assert.equal(scene.bands.filter((band) => band.mist).length, 2);
  const middle = scene.bands[1];
  const near = scene.bands[2];
  const backdropTree = middle.packets.lip.find(({ layers }) => layers?.includes("crown-rear"));
  const foregroundTree = near.packets.lip.find(({ layers }) => layers?.includes("crown-front"));
  assert.deepEqual(foregroundTree.anchor, backdropTree.anchor);
  assert.ok(foregroundTree.layers.includes("trunk"));
  assert.ok(near.packets.structures.some(({ art }) => art.asset_id.endsWith(".brick-infill")));
  const slot = scene.slot;
  const [other] = slot.alternates;
  assert.equal(slot.art.asset_id, "townscape.b01.cafe");
  assert.equal(other.asset_id, "townscape.b01.bookshop");
  const feet = [[433, 737], [505, 737]];
  assert.deepEqual(slot.art.ground.map((p) => projectPoint(slot, p)), feet);
  assert.deepEqual(other.ground.map((p) => projectPoint({ ...slot, art: other }, p)), feet);
  const support = near.packets.foundation.find((foundation) => foundation.art.supported_mode === "stepped_plinth");
  assert.deepEqual(support.art.top_span_uv.map((uv) => projectPoint(support,
    toPixels(support.art.source_dimensions_px, uv))), feet);
  assert.equal(scene.entrances.length, data.buildings.length + 3);
  assert.deepEqual(importHillside(data), scene);
});

test("an invalid replacement wall, displaced stair and invalid source anchors are rejected", () => {
  const source = packs();
  const firstPack = source.values().next().value;
  const bookshop = firstPack.assets.find(({ asset_id }) => asset_id.endsWith(".bookshop"));
  const [u, v] = bookshop.wall_contacts.right.span_uv[0];
  bookshop.wall_contacts.right.span_uv[0] = [u, v + .01];
  assert.throws(() => importHillside(fixture(), importPacks(source)), /shared contacts do not meet/);

  const data = fixture();
  data.nodes["stair-turn"].px[1] += 2;
  assert.throws(() => importHillside(data), /stair landings miss route nodes/);

  const broken = packs();
  broken.values().next().value.assets[0].pivot_uv[0] = -1;
  assert.throws(() => importPacks(broken), /pivot UV/);
});

test("moving a route from an entrance or disconnecting the graph invalidates the fixture", () => {
  const layout = fixture();
  layout.buildings.find(({ id }) => id === "middle-school").route = "gardens-lane";
  assert.throws(() => importHillside(layout), /entrance cannot reach/);
  layout.edges = layout.edges.filter(({ id }) => id !== "upper-stair");
  assert.throws(() => importHillside(layout), /disconnected walking network/);
});
