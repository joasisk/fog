import { createHash } from "node:crypto";
import { constants, createWriteStream } from "node:fs";
import { link, lstat, mkdir, mkdtemp, open, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, posix, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual, parseArgs } from "node:util";

const root = fileURLToPath(new URL("../", import.meta.url));
const audioDirectory = join(root, "assets", "audio");
const manifestPath = "assets/audio/manifest.json";
const freesoundOrigin = "https://freesound.org";
const freesoundRequestInterval = 2_100; // Original downloads are limited to 30 requests per minute.
const freesoundUnauthorized = "Freesound rejected the OAuth access token (HTTP 401). Get a fresh token and rerun";
const sha256Pattern = /^[a-f0-9]{64}$/i;
const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const retryStatuses = new Set([408, 429, 500, 502, 503, 504]);
const retryCodes = new Set([
  "ECONNRESET", "ECONNREFUSED", "EAI_AGAIN", "ETIMEDOUT", "ERR_STREAM_PREMATURE_CLOSE",
  "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_BODY_TIMEOUT", "UND_ERR_SOCKET",
]);

function errorMessage(error) {
  return error.cause ? `${error.message} (${error.cause.message})` : error.message;
}

async function statIfPresent(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function checkDirectory(path, create) {
  if (create) {
    await mkdir(path).catch((error) => {
      if (error.code !== "EEXIST") throw error;
    });
  }
  const stat = await statIfPresent(path);
  if (stat && !stat.isDirectory()) {
    throw new Error(`Expected a directory without a symlink at ${path}`);
  }
}

async function readJson(path) {
  const text = await readFile(path, "utf8");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON in ${path}`, { cause: error });
  }
}

function nonempty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function httpsUrl(value, base) {
  if (!nonempty(value)) throw new Error("Missing direct download URL");
  let url;
  try {
    url = new URL(value, base);
  } catch {
    throw new Error("Invalid direct download URL");
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Direct download URL must use HTTPS without embedded credentials");
  }
  return url;
}

function resolveDownload(record, enableFreesound) {
  const useFreesoundApi = enableFreesound && record?.source === "Freesound" &&
    record.downloadRequiresLogin === true && record.downloadAuthorized === false;
  if (record?.downloadAuthorized !== undefined && record.downloadAuthorized !== true && !useFreesoundApi) {
    throw new Error("Catalogue does not authorize this download URL");
  }

  const listedUrl = httpsUrl(record?.downloadUrl);
  const formatFromUrl = extname(listedUrl.pathname).slice(1);
  if (!useFreesoundApi) return { url: listedUrl, formatFromUrl, useFreesoundApi };

  const takeId = typeof record.id === "string" && /^freesound-([1-9]\d*)$/.exec(record.id)?.[1];
  const listedId = /^\/people\/[^/]+\/sounds\/([1-9]\d*)\/download\/[^/]+$/.exec(listedUrl.pathname)?.[1];
  if (listedUrl.origin !== freesoundOrigin || !takeId || listedId !== takeId) {
    throw new Error("Freesound download URL must match the catalogue's Freesound take ID");
  }
  return { url: new URL(`/apiv2/sounds/${takeId}/download/`, freesoundOrigin), formatFromUrl, useFreesoundApi };
}

function filenamePart(value, field) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9_-]*$/i.test(value)) {
    throw new Error(`Unsafe ${field} ${JSON.stringify(value)}`);
  }
  return value.toLowerCase().replaceAll("_", "-");
}

function playbackMetadata(record) {
  const { duration, durationSeconds, channels, loop, loopable, loopStart, loopEnd, loopStartSeconds, loopEndSeconds, edits } = record;
  return { duration, durationSeconds, channels, loop, loopable, loopStart, loopEnd, loopStartSeconds, loopEndSeconds, edits };
}

function takeKey(category, cueId, takeId) {
  return JSON.stringify([category, cueId, takeId]);
}

function displayId(value, fallback) {
  if (typeof value === "number") return String(value);
  return nonempty(value) ? value.replace(/[\u0000-\u001f\u007f]/g, "?") : fallback;
}

function readCues(catalogue) {
  if (!Array.isArray(catalogue?.cues)) throw new Error("Catalogue must contain a cues array");
  const groups = new Map();
  const takes = new Map();
  for (const [index, cue] of catalogue.cues.entries()) {
    if (!Array.isArray(cue?.takes)) throw new Error(`Catalogue cue ${index + 1} must contain a takes array`);
    const { category, id: cueId } = cue;
    const groupKey = JSON.stringify([category, cueId]);
    if (!groups.has(groupKey)) {
      groups.set(groupKey, { category, id: cueId, ...playbackMetadata(cue), takes: [] });
    }
    for (const [takeIndex, record] of cue.takes.entries()) {
      const takeId = record?.id;
      const key = takeKey(category, cueId, takeId ?? `#${index + 1}.${takeIndex + 1}`);
      const prior = takes.get(key);
      if (prior) {
        prior.duplicateConflict ||= !isDeepStrictEqual(prior.record, record);
        continue;
      }
      takes.set(key, {
        key, record, group: groups.get(groupKey), category, cueId, takeId,
        label: [displayId(category, "?"), displayId(cueId, `cue #${index + 1}`),
          displayId(takeId, `take #${takeIndex + 1}`)].join("/"),
      });
    }
  }
  return { cues: [...groups.values()], takes };
}

async function readRecordedTakes(cataloguePath) {
  const path = join(root, manifestPath);
  const stat = await statIfPresent(path);
  if (!stat) return new Map();
  if (!stat.isFile()) throw new Error(`Expected a regular file at ${manifestPath}`);
  if (await realpath(path) === cataloguePath) throw new Error("Catalogue path is the generated manifest path");
  const manifest = await readJson(path);
  if (manifest?.version !== 1 || !Array.isArray(manifest.cues)) {
    throw new Error(`Unrecognized manifest at ${manifestPath}`);
  }
  const records = new Map();
  for (const cue of manifest.cues) {
    for (const take of cue.takes) {
      records.set(takeKey(cue.category, cue.id, take.id), take);
    }
  }
  return records;
}

async function readAt(file, length, position = 0) {
  const { buffer, bytesRead } = await file.read({ buffer: Buffer.alloc(length), position });
  return buffer.subarray(0, bytesRead);
}

async function isMp3(file, size) {
  const header = await readAt(file, 10);
  let offset = 0;
  if (header.toString("ascii", 0, 3) === "ID3") {
    if (header.length < 10 || header.subarray(6, 10).some((byte) => byte >= 128)) return false;
    const tagSize = header.subarray(6, 10).reduce((length, byte) => length * 128 + byte, 0);
    const hasFooter = header[3] === 4 && (header[5] & 0x10);
    offset = 10 + tagSize + (hasFooter ? 10 : 0);
  }
  const frame = offset ? await readAt(file, 4, offset) : header;
  if (frame.length < 4 || frame[0] !== 0xff || (frame[1] & 0xe6) !== 0xe2) return false;
  const version = (frame[1] >> 3) & 3;
  const bitrateIndex = frame[2] >> 4;
  const sampleRateIndex = (frame[2] >> 2) & 3;
  if (version === 1 || bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) return false;
  const mpeg1 = version === 3;
  const bitrates = mpeg1
    ? [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
    : [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
  const sampleRate = [44100, 48000, 32000][sampleRateIndex] / (mpeg1 ? 1 : version === 2 ? 2 : 4);
  const padding = (frame[2] >> 1) & 1;
  const frameLength = Math.floor((mpeg1 ? 144000 : 72000) * bitrates[bitrateIndex] / sampleRate) + padding;
  return offset + frameLength <= size;
}

async function isWave(file, size) {
  const header = await readAt(file, 12);
  if (header.length < 12 || header.toString("latin1", 0, 4) !== "RIFF" ||
      header.toString("latin1", 8, 12) !== "WAVE") return false;
  const end = header.readUInt32LE(4) + 8;
  if (end > size) return false;
  let blockAlignment = 0;
  for (let offset = 12; offset + 8 <= end;) {
    const chunk = await readAt(file, 8, offset);
    if (chunk.length !== 8) return false;
    const type = chunk.toString("latin1", 0, 4);
    const length = chunk.readUInt32LE(4);
    if (offset + 8 + length > end) return false;
    if (type === "fmt " && length >= 16) {
      const format = await readAt(file, 16, offset + 8);
      if (format.length !== 16 || !format.readUInt16LE(0) || !format.readUInt16LE(2) ||
          !format.readUInt32LE(4)) return false;
      blockAlignment = format.readUInt16LE(12);
    }
    if (type === "data" && blockAlignment && length >= blockAlignment) return true;
    offset += 8 + length + (length % 2);
  }
  return false;
}

async function isOggAudio(file, size, format) {
  const header = await readAt(file, 290);
  if (header.length < 27 || header.toString("latin1", 0, 4) !== "OggS" ||
      header[4] !== 0 || !(header[5] & 2) || !header[26]) return false;
  const packetOffset = 27 + header[26];
  const pageSize = packetOffset + header.subarray(27, packetOffset).reduce((sum, length) => sum + length, 0);
  if (size <= pageSize || header[27] < 8) return false;
  const codec = header.toString("latin1", packetOffset, packetOffset + 8);
  return codec === "OpusHead" || (format === "ogg" && codec.startsWith("\x01vorbis"));
}

async function isFlac(file, size) {
  const header = await readAt(file, 8);
  if (header.length < 8 || header.toString("latin1", 0, 4) !== "fLaC" ||
      (header[4] & 0x7f) !== 0 || header.readUIntBE(5, 3) !== 34) return false;
  for (let offset = 4; offset + 4 < size;) {
    const block = await readAt(file, 4, offset);
    if (block.length !== 4) return false;
    offset += 4 + block.readUIntBE(1, 3);
    if (block[0] & 0x80) {
      const frame = await readAt(file, 2, offset);
      return frame[0] === 0xff && (frame[1] & 0xfe) === 0xf8;
    }
  }
  return false;
}

async function isAiff(file, size) {
  const header = await readAt(file, 12);
  const kind = header.toString("latin1", 8, 12);
  if (header.length < 12 || header.toString("latin1", 0, 4) !== "FORM" ||
      (kind !== "AIFF" && kind !== "AIFC")) return false;
  const end = header.readUInt32BE(4) + 8;
  if (end > size) return false;

  let hasFormat = false;
  let hasSamples = false;
  for (let offset = 12; offset + 8 <= end;) {
    const chunk = await readAt(file, 8, offset);
    if (chunk.length !== 8) return false;
    const type = chunk.toString("latin1", 0, 4);
    const length = chunk.readUInt32BE(4);
    const payload = offset + 8;
    if (payload + length > end) return false;
    if (type === "COMM" && length >= (kind === "AIFC" ? 22 : 18)) {
      const format = await readAt(file, 6, payload);
      hasFormat = format.length === 6 && format.readUInt16BE(0) > 0 && format.readUInt32BE(2) > 0;
    }
    if (type === "SSND" && length > 8) {
      const sound = await readAt(file, 8, payload);
      hasSamples = sound.length === 8 && sound.readUInt32BE(0) < length - 8;
    }
    if (hasFormat && hasSamples) return true;
    offset = payload + length + (length % 2);
  }
  return false;
}

async function* mp4Boxes(file, { start, end }) {
  for (let offset = start; offset + 8 <= end;) {
    const header = await readAt(file, 8, offset);
    if (header.length !== 8) return;
    const type = header.toString("latin1", 4, 8);
    let length = header.readUInt32BE(0);
    let headerLength = 8;
    if (length === 1) {
      const extended = await readAt(file, 8, offset + 8);
      if (extended.length !== 8) return;
      length = Number(extended.readBigUInt64BE());
      headerLength = 16;
    } else if (length === 0) {
      length = end - offset;
    }
    if (length < headerLength || length > end - offset) return;
    yield { type, start: offset + headerLength, end: offset + length };
    offset += length;
  }
}

async function findMp4Box(file, container, type) {
  for await (const box of mp4Boxes(file, container)) {
    if (box.type === type) return box;
  }
}

async function isM4a(file, size) {
  const container = { start: 0, end: size };
  const fileType = await findMp4Box(file, container, "ftyp");
  const movie = await findMp4Box(file, container, "moov");
  const data = await findMp4Box(file, container, "mdat");
  if (!fileType || fileType.end - fileType.start < 8 || !movie || !data || data.end === data.start) return false;

  for await (const track of mp4Boxes(file, movie)) {
    if (track.type !== "trak") continue;
    const media = await findMp4Box(file, track, "mdia");
    const handler = media && await findMp4Box(file, media, "hdlr");
    if (handler && handler.end - handler.start >= 12) {
      const type = await readAt(file, 4, handler.start + 8);
      if (type.toString("latin1") === "soun") return true;
    }
  }
  return false;
}

const audioChecks = new Map([
  ["mp3", isMp3], ["wav", isWave], ["ogg", isOggAudio], ["opus", isOggAudio], ["flac", isFlac],
  ["aiff", isAiff], ["m4a", isM4a],
]);

async function verifyFile(path, format, expected) {
  const file = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const stat = await file.stat();
    if (!stat.isFile()) throw new Error("Expected a regular audio file");
    const hash = createHash("sha256");
    let bytes = 0;
    for await (const chunk of file.createReadStream({ start: 0, autoClose: false })) {
      hash.update(chunk);
      bytes += chunk.length;
    }
    const sha256 = hash.digest("hex");
    if (expected && sha256 !== expected) {
      throw new Error(`SHA-256 mismatch (expected ${expected}, got ${sha256})`);
    }
    if (bytes !== stat.size || !await audioChecks.get(format)(file, bytes, format)) {
      throw new Error(`Expected ${format.toUpperCase()} audio`);
    }
    return { bytes, sha256 };
  } finally {
    await file.close();
  }
}

async function verifyExisting(path, format, expected) {
  try {
    const stat = await lstat(path);
    if (!stat.isFile()) throw new Error("Destination is not a regular file");
    return await verifyFile(path, format, expected);
  } catch (error) {
    throw new Error(`Conflict at ${path} (${errorMessage(error)})`);
  }
}

async function fetchDirect(take, freesound) {
  let { url } = take;
  let headers;
  if (take.useFreesoundApi) {
    if (freesound.rejected) throw new Error(freesoundUnauthorized);
    if (!freesound.token || !/^[a-z0-9._~+/-]+=*$/i.test(freesound.token)) {
      throw new Error("Set FREESOUND_ACCESS_TOKEN to a Freesound OAuth access token");
    }
    const wait = freesound.nextRequest - performance.now();
    if (wait > 0) await delay(wait);
    freesound.nextRequest = performance.now() + freesoundRequestInterval;
    headers = { Authorization: `Bearer ${freesound.token}` };
  }
  const signal = AbortSignal.timeout(take.useFreesoundApi ? 300_000 : 30_000);
  for (let redirects = 0; ; redirects++) {
    const response = await fetch(url, { headers, redirect: "manual", signal });
    if (headers && response.status === 401) {
      freesound.rejected = true;
      await response.body?.cancel();
      throw new Error(freesoundUnauthorized);
    }
    // The OAuth header applies only to the official API request. Redirects may point to a CDN.
    headers = undefined;
    if (!redirectStatuses.has(response.status)) return response;
    await response.body?.cancel();
    const location = response.headers.get("location");
    if (redirects >= 5 || !location) throw new Error("Invalid or excessive download redirects");
    url = httpsUrl(location, url);
  }
}

class HttpError extends Error {
  constructor(status, retryAfter) {
    super(`HTTP ${status}`);
    this.status = status;
    if (retryAfter) {
      const milliseconds = /^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - Date.now();
      this.retryAfter = Math.min(60_000, Math.max(0, milliseconds || 0));
    }
  }
}

async function receiveFile(take, path, freesound) {
  const response = await fetchDirect(take, freesound);
  try {
    if (response.status !== 200) throw new HttpError(response.status, response.headers.get("retry-after"));
    const type = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
    if (type === "text/html" || type === "application/xhtml+xml") {
      throw new Error(`Unexpected Content-Type ${type}`);
    }
    if (!response.body) throw new Error("Empty download response");
  } catch (error) {
    await response.body?.cancel();
    throw error;
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(path));
}

async function download(take, path, freesound) {
  for (let attempt = 1; ; attempt++) {
    try {
      await receiveFile(take, path, freesound);
      return;
    } catch (error) {
      const retryable = retryStatuses.has(error.status) || error.name === "TimeoutError" ||
        retryCodes.has(error.cause?.code ?? error.code);
      if (attempt === 3 || !retryable) throw error;
      console.log(`Retrying ${take.label} (${errorMessage(error)})`);
      await delay(Math.max(error.retryAfter ?? 0, 500 * 2 ** (attempt - 1)));
    }
  }
}

function planTake(take, recorded) {
  const { record } = take;
  const category = filenamePart(take.category, "category");
  if (/^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])$/.test(category)) throw new Error(`Unsafe category ${category}`);
  const cue = filenamePart(take.cueId, "cue ID");
  const id = Number.isSafeInteger(take.takeId) && take.takeId >= 0
    ? String(take.takeId).padStart(2, "0") : filenamePart(take.takeId, "take ID");
  const declaredFormat = record.format ?? take.formatFromUrl;
  const format = typeof declaredFormat === "string" ? declaredFormat.toLowerCase() : "";
  if (!audioChecks.has(format)) throw new Error(`Unsupported or missing audio format ${JSON.stringify(format)}`);
  if (record.sha256 != null && (typeof record.sha256 !== "string" || !sha256Pattern.test(record.sha256))) {
    throw new Error("Invalid SHA-256 in catalogue");
  }
  const path = posix.join("assets", "audio", category, `${cue}-${id}.${format}`);
  const manifestChecksum = recorded?.path === path && recorded.downloadUrl === take.url.href &&
    typeof recorded.sha256 === "string" && sha256Pattern.test(recorded.sha256) ? recorded.sha256 : undefined;
  return { ...take, format, path, checksum: (record.sha256 ?? manifestChecksum)?.toLowerCase() };
}

function licenseIssue(record) {
  if (!nonempty(record?.license)) return "Missing license";
  if (record.license !== "CC0-1.0" && record.license !== "CC0") return `Ineligible license ${JSON.stringify(record.license)}`;
  if (record.verified !== true) return "CC0 license verification is missing";
  if (!nonempty(record.licenseEvidence)) return "Missing CC0 license evidence";
}

async function installTake(take, dryRun, freesound) {
  const path = join(root, take.path);
  await checkDirectory(dirname(path), !dryRun);
  const existing = await statIfPresent(path);
  if (existing && !existing.isFile()) throw new Error(`Conflict at ${path} (destination is not a regular file)`);
  if (existing && take.checksum) {
    return { status: "reused", ...await verifyExisting(path, take.format, take.checksum) };
  }
  if (dryRun) return { status: "planned" };

  const temporaryDirectory = await mkdtemp(join(dirname(path), ".download-"));
  try {
    const temporaryFile = join(temporaryDirectory, "audio");
    await download(take, temporaryFile, freesound);
    const verified = await verifyFile(temporaryFile, take.format, take.checksum);
    try {
      // Publish the complete file atomically and leave any existing destination in place.
      await link(temporaryFile, path);
      return { status: "downloaded", ...verified };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      return { status: "reused", ...await verifyExisting(path, take.format, verified.sha256) };
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function writeManifest(manifest) {
  const temporaryDirectory = await mkdtemp(join(audioDirectory, ".manifest-"));
  try {
    const path = join(temporaryDirectory, "manifest.json");
    await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
    await rename(path, join(root, manifestPath));
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function main() {
  const { values } = parseArgs({ options: {
    catalog: { type: "string", default: join(root, "sound-catalog.json") },
    "dry-run": { type: "boolean" },
    freesound: { type: "boolean" },
  } });
  const dryRun = values["dry-run"];
  const freesound = { token: process.env.FREESOUND_ACCESS_TOKEN?.trim(), nextRequest: 0, rejected: false };
  const cataloguePath = await realpath(resolve(values.catalog));
  const { cues, takes } = readCues(await readJson(cataloguePath));
  await checkDirectory(join(root, "assets"), !dryRun);
  await checkDirectory(audioDirectory, !dryRun);
  const recorded = await readRecordedTakes(cataloguePath);

  const skipped = { missingDownloadUrls: [], uncertainLicenses: [], needsReplacement: [] };
  const failed = [];
  const counts = { downloaded: 0, reused: 0, skipped: 0, planned: 0, bytes: 0 };
  const planned = [];
  const destinations = new Map();
  for (const take of takes.values()) {
    const { record, label } = take;
    if (take.duplicateConflict) {
      failed.push({ take: label, reason: "Conflicting catalogue entries for the same take ID" });
      continue;
    }
    if (record.availability === "missing" && record.replacementRequired === true) {
      skipped.needsReplacement.push({ take: label, reason: record.replacementReason ?? "Missing recording needs replacement" });
      counts.skipped++;
      continue;
    }
    try {
      Object.assign(take, resolveDownload(record, values.freesound));
    } catch (error) {
      skipped.missingDownloadUrls.push({ take: label, reason: errorMessage(error) });
    }
    const licenseProblem = licenseIssue(record);
    if (licenseProblem) skipped.uncertainLicenses.push({ take: label, reason: licenseProblem });
    if (licenseProblem || !take.url) {
      counts.skipped++;
      continue;
    }
    try {
      const entry = planTake(take, recorded.get(take.key));
      planned.push(entry);
      destinations.set(entry.path, (destinations.get(entry.path) ?? 0) + 1);
    } catch (error) {
      failed.push({ take: label, reason: errorMessage(error) });
    }
  }

  for (const take of planned) {
    const { record, label, path } = take;
    try {
      if (destinations.get(path) > 1) throw new Error(`Catalogue takes share the destination ${path}`);
      const { status, bytes, sha256 } = await installTake(take, dryRun, freesound);
      counts[status]++;
      if (status === "planned") {
        console.log(`Would download or verify ${label} → ${path}`);
        continue;
      }
      counts.bytes += bytes;
      console.log(`${status === "downloaded" ? "Downloaded" : "Reused"} ${label} → ${path}`);
      take.group.takes.push({
        id: take.takeId,
        path,
        sourceUrl: record.sourceUrl ?? null,
        downloadUrl: take.url.href,
        creator: record.creator ?? null,
        license: "CC0-1.0",
        licenseEvidence: record.licenseEvidence,
        bytes,
        sha256,
        ...playbackMetadata(record),
      });
    } catch (error) {
      failed.push({ take: label, reason: errorMessage(error) });
    }
  }

  for (const [heading, entries] of [
    ["Missing or unusable direct download URLs", skipped.missingDownloadUrls],
    ["Uncertain or ineligible licenses", skipped.uncertainLicenses],
    ["Missing recordings that need replacement", skipped.needsReplacement],
    ["Failed takes", failed],
  ]) {
    if (entries.length) console.log(heading);
    for (const { take, reason } of entries) console.log(`  ${take} (${reason})`);
  }
  if (!dryRun) await writeManifest({ version: 1, cues, skipped, failed });
  console.log(`Downloaded ${counts.downloaded}, reused ${counts.reused}, skipped ${counts.skipped}, failed ${failed.length}`);
  if (dryRun) console.log(`Planned downloads or checks ${counts.planned}`);
  console.log(`Total size ${counts.bytes} bytes`);
  console.log(`Manifest ${manifestPath}${dryRun ? " (dry run)" : ""}`);
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(errorMessage(error));
  process.exitCode = 1;
});
