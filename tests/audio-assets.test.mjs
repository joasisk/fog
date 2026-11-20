import assert from "node:assert/strict";
import test from "node:test";
import { localRecordings } from "../src/audio/local-recordings.ts";
import { SoundCue, SoundLicense } from "../src/model/sound.ts";

const original = { url: "./audio/rain.wav", creator: "Fog", license: SoundLicense.Original };
const fallback = { [SoundCue.SoftRain]: [original], [SoundCue.MilkSteamer]: [original] };
const path = "assets/audio/environment/rain-real.ogg";
const record = {
  path, creator: "Field recordist", license: SoundLicense.CC0,
  sourceUrl: "https://example.com/rain", loopStartSeconds: .5, loopEndSeconds: 9, edits: "Trimmed",
};

test("manifest takes take precedence over provisional cues and retain source and loop metadata", () => {
  const manifest = {
    version: 1,
    cues: [
      { id: "soft_rain", takes: [record, record] },
      { id: "cafe_chatter", takes: [{ ...record, path: "assets/audio/buildings/chat.ogg" }] },
    ],
  };
  const assets = localRecordings(manifest, (path) => "/fog/" + path, fallback);
  assert.deepEqual(assets[SoundCue.SoftRain], [{
    url: "/fog/" + path, creator: record.creator, license: record.license, sourceUrl: record.sourceUrl,
    loop: { start: .5, end: 9 }, edits: "Trimmed",
  }]);
  assert.equal(assets[SoundCue.CafeChatter].length, 1);
  assert.deepEqual(assets[SoundCue.MilkSteamer], fallback[SoundCue.MilkSteamer]);
});

test("absent manifests, missing recordings and unsupported licenses leave fallbacks available", () => {
  assert.equal(localRecordings(undefined, () => undefined, fallback), fallback);
  const manifest = { version: 1, cues: [{ id: "soft_rain", takes: [record, { ...record, license: "CC-BY" }] }] };
  assert.deepEqual(localRecordings(manifest, () => undefined, fallback), fallback);
  manifest.cues[0].takes.shift();
  assert.deepEqual(localRecordings(manifest, () => "/audio/rain.ogg", fallback), fallback);
});
