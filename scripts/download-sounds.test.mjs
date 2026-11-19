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

function cue(takes, overrides = {}) {
  return { category: "street", id: "wet_pavement_steps", takes, ...overrides };
}

async function project(cues) {
  const root = await mkdtemp(join(fixtureDirectory, "project-"));
  const catalogue = JSON.stringify({ cues });
  await mkdir(join(root, "scripts"));
  await copyFile(new URL("./download-sounds.mjs", import.meta.url), join(root, "scripts/download-sounds.mjs"));
  await writeFile(join(root, "fixture-catalog.json"), catalogue);
  return {
    root,
    catalogue,
    manifest: async () => JSON.parse(await readFile(join(root, manifestPath), "utf8")),
    run: async (...flags) => {
      const args = ["scripts/download-sounds.mjs", "--catalog", "fixture-catalog.json", ...flags];
      try {
        const result = await execute(process.execPath, args, {
          cwd: root,
          env: { ...process.env, NODE_EXTRA_CA_CERTS: certificate },
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
