import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { promisify } from "node:util";

const execute = promisify(execFile);
const manifestPath = "assets/audio/manifest.json";
const audioPath = "assets/audio/street/wet-pavement-steps-01.wav";
const requests = new Map();
const routes = new Map();
const authorizationHeaders = new Map();
const freesoundToken = "fixture-access-token";
let fixtureDirectory;
let certificate;
let server;
let origin;

function wave(sample = 0) {
  const buffer = Buffer.alloc(204);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(8000, 24);
  buffer.writeUInt32LE(16000, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(buffer.length - 44, 40);
  buffer.writeInt16LE(sample, 44);
  return buffer;
}

function aiff() {
  const buffer = Buffer.alloc(56);
  buffer.write("FORM", 0);
  buffer.writeUInt32BE(buffer.length - 8, 4);
  buffer.write("AIFFCOMM", 8);
  buffer.writeUInt32BE(18, 16);
  buffer.writeUInt16BE(1, 20); // Mono
  buffer.writeUInt32BE(1, 22); // One sample
  buffer.writeUInt16BE(16, 26);
  Buffer.from("400bfa00000000000000", "hex").copy(buffer, 28); // 8 kHz in 80-bit extended precision
  buffer.write("SSND", 38);
  buffer.writeUInt32BE(10, 42);
  return buffer;
}

function mp4Box(type, ...contents) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(8 + contents.reduce((sum, data) => sum + data.length, 0));
  header.write(type, 4);
  return Buffer.concat([header, ...contents]);
}

function mp4WithHandler(handler) {
  return Buffer.concat([
    mp4Box("ftyp", Buffer.from("M4A "), Buffer.alloc(4)),
    mp4Box("moov", mp4Box("trak", mp4Box("mdia", mp4Box("hdlr", Buffer.alloc(8), Buffer.from(handler))))),
    mp4Box("mdat", Buffer.from([1, 2, 3])),
  ]);
}

const audio = wave();
const checksum = createHash("sha256").update(audio).digest("hex");

function serveAudio(response) {
  response.writeHead(200, { "Content-Type": "audio/wav" }).end(audio);
}

before(async () => {
  fixtureDirectory = await mkdtemp(join(tmpdir(), "fog-sounds-"));
  certificate = join(fixtureDirectory, "cert.pem");
  const key = join(fixtureDirectory, "key.pem");
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=localhost",
    "-addext", "subjectAltName=IP:127.0.0.1", "-out", certificate, "-keyout", key,
  ], { stdio: "pipe" });
  server = createServer({ cert: await readFile(certificate), key: await readFile(key) }, (request, response) => {
    const count = (requests.get(request.url) ?? 0) + 1;
    requests.set(request.url, count);
    authorizationHeaders.set(request.url, request.headers.authorization);
    const route = routes.get(request.url);
    if (route) route(response, count);
    else response.writeHead(404).end();
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  origin = `https://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  if (fixtureDirectory) await rm(fixtureDirectory, { recursive: true, force: true });
});

function take(path, overrides = {}) {
  return {
    id: "01",
    downloadUrl: `${origin}${path}`,
    creator: "Fixture creator",
    sourceUrl: "https://example.org/recording",
    license: "CC0-1.0",
    licenseEvidence: "CC0 dedication on the source page",
    verified: true,
    ...overrides,
  };
}

function freesoundTake(id, overrides = {}) {
  return take("/unused.wav", {
    id: `freesound-${id}`,
    source: "Freesound",
    sourceUrl: `https://freesound.org/people/recorder/sounds/${id}/`,
    downloadUrl: `https://freesound.org/people/recorder/sounds/${id}/download/recording.wav`,
    downloadAuthorized: false,
    downloadRequiresLogin: true,
    ...overrides,
  });
}

function cue(takes, overrides = {}) {
  return { category: "street", id: "wet_pavement_steps", takes, ...overrides };
}

async function project(cues, { token, stubFreesound = false } = {}) {
  const root = await mkdtemp(join(fixtureDirectory, "project-"));
  const catalogue = JSON.stringify({ cues });
  await mkdir(join(root, "scripts"));
  await copyFile(new URL("./download-sounds.mjs", import.meta.url), join(root, "scripts/download-sounds.mjs"));
  await writeFile(join(root, "fixture-catalog.json"), catalogue);
  const preload = [];
  if (stubFreesound) {
    const mock = "freesound-fetch.mjs";
    await writeFile(join(root, mock), `
const fetchHttps = globalThis.fetch;
globalThis.fetch = (url, options) => {
  const localUrl = url.origin === "https://freesound.org" ? new URL(url.pathname, ${JSON.stringify(origin)}) : url;
  return fetchHttps(localUrl, options);
};
`);
    preload.push("--import", `./${mock}`);
  }
  const env = { ...process.env, NODE_EXTRA_CA_CERTS: certificate };
  delete env.FREESOUND_ACCESS_TOKEN;
  if (token !== undefined) env.FREESOUND_ACCESS_TOKEN = token;
  return {
    root,
    catalogue,
    manifest: async () => JSON.parse(await readFile(join(root, manifestPath), "utf8")),
    run: async (...flags) => {
      const args = [...preload, "scripts/download-sounds.mjs", "--catalog", "fixture-catalog.json", ...flags];
      try {
        const result = await execute(process.execPath, args, {
          cwd: root,
          env,
        });
        return { ...result, status: 0 };
      } catch (error) {
        if (typeof error.code !== "number") throw error;
        return { stdout: error.stdout, stderr: error.stderr, status: error.code };
      }
    },
  };
}

test("previews, downloads, and reuses a distinct verified take", async () => {
  routes.set("/success.wav", serveAudio);
  const selected = take("/success.wav", { durationSeconds: 0.01, channels: 1, loop: false });
  const fixture = await project([cue([selected, selected])]);
  const dryRun = await fixture.run("--dry-run");
  assert.equal(dryRun.status, 0, dryRun.stderr);
  assert.match(dryRun.stdout, /Planned downloads or checks 1/);
  assert.equal(requests.has("/success.wav"), false);
  await assert.rejects(stat(join(fixture.root, "assets")), { code: "ENOENT" });

  const result = await fixture.run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Downloaded 1, reused 0, skipped 0, failed 0/);
  assert.match(result.stdout, /Total size 204 bytes/);
  assert.equal(requests.get("/success.wav"), 1);
  assert.deepEqual(await readFile(join(fixture.root, audioPath)), audio);
  assert.equal(await readFile(join(fixture.root, "fixture-catalog.json"), "utf8"), fixture.catalogue);
  const manifest = await fixture.manifest();
  assert.deepEqual(manifest.cues, [cue([{
    id: "01",
    path: audioPath,
    downloadUrl: selected.downloadUrl,
    sourceUrl: selected.sourceUrl,
    creator: selected.creator,
    license: selected.license,
    licenseEvidence: selected.licenseEvidence,
    bytes: audio.length,
    sha256: checksum,
    durationSeconds: 0.01,
    channels: 1,
    loop: false,
  }])]);

  const rerun = await fixture.run();
  assert.equal(rerun.status, 0, rerun.stderr);
  assert.match(rerun.stdout, /Downloaded 0, reused 1, skipped 0, failed 0/);
  assert.equal(requests.get("/success.wav"), 1);
  assert.deepEqual(await fixture.manifest(), manifest);

  const different = wave(1);
  await writeFile(join(fixture.root, audioPath), different);
  const conflict = await fixture.run();
  assert.equal(conflict.status, 1);
  assert.match(conflict.stdout, /Conflict at .*wet-pavement-steps-01\.wav .*SHA-256 mismatch/);
  assert.equal(requests.get("/success.wav"), 1);
  assert.deepEqual(await readFile(join(fixture.root, audioPath)), different);
});

test("rejects HTML even if served with an audio Content-Type", async () => {
  routes.set("/html.wav", (response) => {
    response.writeHead(200, { "Content-Type": "audio/wav" }).end("<!doctype html><title>Sign in</title>");
  });
  const fixture = await project([cue([take("/html.wav")])]);
  const result = await fixture.run();
  assert.equal(result.status, 1);
  assert.match(result.stdout, /street\/wet_pavement_steps\/01 \(Expected WAV audio\)/);
  assert.equal(requests.get("/html.wav"), 1);
  assert.deepEqual(await readdir(join(fixture.root, "assets/audio/street")), []);
  assert.deepEqual((await fixture.manifest()).cues, [cue([])]);
});

test("rejects a catalogue SHA-256 mismatch", async () => {
  routes.set("/checksum.wav", serveAudio);
  const fixture = await project([cue([take("/checksum.wav", { sha256: "0".repeat(64) })])]);
  const result = await fixture.run();
  assert.equal(result.status, 1);
  assert.match(result.stdout, /street\/wet_pavement_steps\/01 \(SHA-256 mismatch/);
  assert.equal(requests.get("/checksum.wav"), 1);
  await assert.rejects(stat(join(fixture.root, audioPath)), { code: "ENOENT" });
});

test("continues after a failed take, retries a transient failure, and reports skips", async () => {
  routes.set("/retry.wav", (response, count) => {
    if (count === 1) response.writeHead(503).end();
    else serveAudio(response);
  });
  const fixture = await project([
    cue([
      take("/gone.wav", { id: "02" }),
      take("/retry.wav", { sha256: checksum.toUpperCase(), creator: undefined }),
    ]),
    cue([
      take("/unused.wav", { downloadUrl: null }),
      take("/unverified.wav", { id: "02", verified: false }),
    ], { category: "environment", id: "soft_rain", loop: true }),
  ]);
  const result = await fixture.run();
  assert.equal(result.status, 1);
  assert.match(result.stdout, /street\/wet_pavement_steps\/02 \(HTTP 404\)/);
  assert.match(result.stdout, /Missing or unusable direct download URLs\n  environment\/soft_rain\/01/);
  assert.match(result.stdout, /Uncertain or ineligible licenses\n  environment\/soft_rain\/02/);
  assert.match(result.stdout, /Downloaded 1, reused 0, skipped 2, failed 1/);
  assert.match(result.stdout, /Manifest assets\/audio\/manifest\.json/);
  assert.equal(requests.get("/gone.wav"), 1);
  assert.equal(requests.get("/retry.wav"), 2);
  assert.equal(requests.has("/unverified.wav"), false);
  const manifest = await fixture.manifest();
  assert.equal(manifest.cues[0].takes[0].path, audioPath);
  assert.equal(manifest.cues[0].takes[0].sha256, checksum);
  assert.equal(manifest.cues[0].takes[0].creator, null);
  assert.deepEqual(manifest.cues[1], cue([], { category: "environment", id: "soft_rain", loop: true }));
  assert.equal(manifest.failed.length, 1);
});

test("reports takes needing replacement without downloading or publishing them", async () => {
  const reason = "Exceeds the GitHub per-file limit.";
  const fixture = await project([cue([take("/oversize.wav", {
    availability: "missing", replacementRequired: true, replacementReason: reason,
  })])]);
  const result = await fixture.run();
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Missing recordings that need replacement/);
  assert.equal(requests.has("/oversize.wav"), false);
  const manifest = await fixture.manifest();
  assert.deepEqual(manifest.cues, [cue([])]);
  assert.deepEqual(manifest.skipped.needsReplacement, [{ take: "street/wet_pavement_steps/01", reason }]);
});

test("rejects path traversal and symlinked asset directories", async () => {
  const fixture = await project([
    cue([take("/unsafe.wav")], { category: "../outside" }),
    cue([take("/unsafe.wav")]),
  ]);
  const outside = join(fixture.root, "outside");
  await mkdir(outside);
  await mkdir(join(fixture.root, "assets/audio"), { recursive: true });
  await symlink(outside, join(fixture.root, "assets/audio/street"), "junction");
  const result = await fixture.run();
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Unsafe category/);
  assert.match(result.stdout, /Expected a directory without a symlink/);
  assert.equal(requests.has("/unsafe.wav"), false);
  assert.deepEqual(await readdir(outside), []);
});

test("downloads Freesound originals with an opt-in token scoped to the API request", async () => {
  const apiPath = "/apiv2/sounds/101/download/";
  routes.set(apiPath, (response, count) => {
    if (count === 1) response.writeHead(429, { "Retry-After": "1" }).end();
    else response.writeHead(302, { Location: `${origin}/freesound-original.wav` }).end();
  });
  routes.set("/freesound-original.wav", serveAudio);
  routes.set("/with-freesound-direct.wav", serveAudio);
  const fixture = await project([cue([
    freesoundTake(101),
    freesoundTake(102, { verified: false }),
    freesoundTake(103, { downloadUrl: `${origin}/wrong-freesound-host.wav` }),
    take("/with-freesound-direct.wav"),
  ])], { token: freesoundToken, stubFreesound: true });

  const standard = await fixture.run("--dry-run");
  assert.equal(standard.status, 0, standard.stderr);
  assert.match(standard.stdout, /Planned downloads or checks 1/);
  assert.equal(requests.has(apiPath), false);

  const result = await fixture.run("--freesound");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Retrying .* \(HTTP 429\)/);
  assert.match(result.stdout, /Downloaded 2, reused 0, skipped 2, failed 0/);
  assert.equal(authorizationHeaders.get(apiPath), `Bearer ${freesoundToken}`);
  assert.equal(requests.get("/freesound-original.wav"), 1);
  assert.equal(authorizationHeaders.get("/freesound-original.wav"), undefined);
  assert.equal(authorizationHeaders.get("/with-freesound-direct.wav"), undefined);
  assert.equal(requests.has("/apiv2/sounds/102/download/"), false);
  assert.equal(requests.has("/wrong-freesound-host.wav"), false);

  const manifest = await fixture.manifest();
  assert.equal(manifest.cues[0].takes[0].downloadUrl, `https://freesound.org${apiPath}`);
  assert.equal(manifest.cues[0].takes[0].path, "assets/audio/street/wet-pavement-steps-freesound-101.wav");
  assert.ok(!JSON.stringify(manifest).includes(freesoundToken));
  assert.ok(!result.stdout.includes(freesoundToken));

  const rerun = await fixture.run("--freesound");
  assert.equal(rerun.status, 0, rerun.stderr);
  assert.match(rerun.stdout, /Downloaded 0, reused 2, skipped 2, failed 0/);
  assert.equal(requests.get(apiPath), 2);
});

test("reports a rejected Freesound token and continues processing direct downloads", async () => {
  routes.set("/apiv2/sounds/201/download/", (response) => response.writeHead(401).end());
  routes.set("/after-freesound-error.wav", serveAudio);
  const fixture = await project([cue([
    freesoundTake(201),
    freesoundTake(202),
    take("/after-freesound-error.wav"),
  ])], { token: freesoundToken, stubFreesound: true });

  const result = await fixture.run("--freesound");
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Freesound rejected the OAuth access token \(HTTP 401\)/);
  assert.match(result.stdout, /Downloaded 1, reused 0, skipped 0, failed 2/);
  assert.equal(requests.get("/apiv2/sounds/201/download/"), 1);
  assert.equal(requests.has("/apiv2/sounds/202/download/"), false);
  assert.equal(authorizationHeaders.get("/after-freesound-error.wav"), undefined);
});

test("plans Freesound downloads without a token and reports the missing token on a live run", async () => {
  const fixture = await project([cue([freesoundTake(301)])], { stubFreesound: true });
  const preview = await fixture.run("--freesound", "--dry-run");
  assert.equal(preview.status, 0, preview.stderr);
  assert.match(preview.stdout, /Planned downloads or checks 1/);
  const result = await fixture.run("--freesound");
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Set FREESOUND_ACCESS_TOKEN/);
  assert.equal(requests.has("/apiv2/sounds/301/download/"), false);
});

test("accepts AIFF and audio-only M4A and rejects files with only a video track", async () => {
  routes.set("/clip.aiff", (response) => response.end(aiff()));
  routes.set("/clip.m4a", (response) => response.end(mp4WithHandler("soun")));
  routes.set("/video.m4a", (response) => response.end(mp4WithHandler("vide")));
  const fixture = await project([cue([
    take("/clip.aiff"), take("/clip.m4a", { id: "02" }), take("/video.m4a", { id: "03" }),
  ])]);
  const result = await fixture.run();
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Downloaded 2, reused 0, skipped 0, failed 1/);
  assert.match(result.stdout, /03 \(Expected M4A audio\)/);
});
