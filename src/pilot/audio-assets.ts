import { localRecordings } from "../audio/local-recordings.ts";
import { SoundCue, SoundLicense } from "../model/sound.ts";
import type { SoundAssets } from "../model/sound.ts";

const take = (filename: string) => ({
  url: `${import.meta.env.BASE_URL}audio/${filename}.wav`, creator: "Fog pilot",
  license: SoundLicense.Original, edits: "Procedurally synthesized for the pilot.",
}) as const;

const provisionalAudio: SoundAssets = {
  [SoundCue.SoftRain]: [take("soft-rain")],
  [SoundCue.CafeChatter]: [take("cafe-murmur")],
  [SoundCue.MilkSteamer]: [take("milk-steamer")],
  [SoundCue.DoorChime]: [take("door-chime")],
  [SoundCue.WetPavementFootsteps]: [take("wet-footsteps-1"), take("wet-footsteps-2")],
  [SoundCue.PassingCar]: [take("passing-car")],
  [SoundCue.ChildrenLaughter]: [take("park-laughter")],
  [SoundCue.PageTurn]: [take("page-turn")],
};

const manifests = import.meta.glob<Parameters<typeof localRecordings>[0]>("/assets/audio/manifest.json", {
  eager: true, import: "default",
});
const urls = import.meta.glob<string>("/assets/audio/**/*.{wav,wave,mp3,ogg,oga,opus,flac,m4a,aac,aif,aiff,webm}", {
  eager: true, import: "default", query: "?url&no-inline",
});

export const pilotAudio = localRecordings(
  manifests["/assets/audio/manifest.json"],
  (path) => urls[`/${path}`],
  provisionalAudio,
);
