import { SoundCue, SoundLicense } from "../model/sound.ts";
import type { SoundAssets } from "../model/sound.ts";

const take = (filename: string) => ({
  url: `${import.meta.env.BASE_URL}audio/${filename}.wav`, creator: "Fog pilot",
  license: SoundLicense.Original, edits: "Procedurally synthesized for the pilot.",
}) as const;

export const pilotAudio: SoundAssets = {
  [SoundCue.SoftRain]: [take("soft-rain")],
  [SoundCue.AdultVoices]: [take("cafe-murmur")],
  [SoundCue.MilkSteamer]: [take("milk-steamer")],
  [SoundCue.DoorChime]: [take("door-chime")],
  [SoundCue.WetPavementFootsteps]: [take("wet-footsteps-1"), take("wet-footsteps-2")],
  [SoundCue.PassingCar]: [take("passing-car")],
  [SoundCue.ChildrenLaughter]: [take("park-laughter")],
  [SoundCue.PageTurn]: [take("page-turn")],
};
