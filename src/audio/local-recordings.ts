import { SoundCue, SoundLicense } from "../model/sound.ts";
import type { SoundAssets, SoundTake } from "../model/sound.ts";
import type { NonEmpty } from "../model/geometry.ts";

interface ManifestTake {
  readonly path: string;
  readonly creator?: string | null;
  readonly sourceUrl?: string | null;
  readonly license: string;
  readonly edits?: string;
  readonly loopStart?: number;
  readonly loopEnd?: number;
  readonly loopStartSeconds?: number;
  readonly loopEndSeconds?: number;
}

interface Manifest {
  readonly version: number;
  readonly cues: readonly { readonly id: string; readonly takes: readonly ManifestTake[] }[];
}

const cues = new Map<string, SoundCue>(Object.values(SoundCue).map((cue) => [cue, cue]));

export function localRecordings(
  manifest: Manifest | undefined,
  resolveUrl: (path: string) => string | undefined,
  fallback: SoundAssets,
): SoundAssets {
  if (manifest?.version !== 1) return fallback;
  const recordings = new Map<SoundCue, NonEmpty<SoundTake>>();
  for (const group of manifest.cues) {
    const cue = cues.get(group.id);
    if (!cue) continue;
    for (const record of group.takes) {
      if (!record.path.startsWith("assets/audio/")) continue;
      const url = resolveUrl(record.path);
      if (!url || recordings.get(cue)?.some((take) => take.url === url)) continue;
      const start = record.loopStartSeconds ?? record.loopStart ?? 0;
      const end = record.loopEndSeconds ?? record.loopEnd;
      const metadata = {
        url,
        creator: record.creator || "Unknown creator",
        ...(typeof record.edits === "string" ? { edits: record.edits } : {}),
        ...(Number.isFinite(start) && typeof end === "number" && Number.isFinite(end) && start >= 0 && end > start
          ? { loop: { start, end } } : {}),
      };
      const take: SoundTake | undefined = record.license === SoundLicense.CC0 && record.sourceUrl
        ? { ...metadata, license: SoundLicense.CC0, sourceUrl: record.sourceUrl }
        : record.license === SoundLicense.Original ? { ...metadata, license: SoundLicense.Original } : undefined;
      if (take) {
        const previous = recordings.get(cue);
        recordings.set(cue, previous ? [...previous, take] : [take]);
      }
    }
  }
  return { ...fallback, ...Object.fromEntries(recordings) };
}
