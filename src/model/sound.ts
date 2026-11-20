import type { BuildingType } from "./building-designs.ts";
import type { NonEmpty, NumberRange, Polyline, ScenePosition } from "./geometry.ts";
import type { TreeId } from "./landscape.ts";
import { StreetProfile } from "./network.ts";
import type { FootpathId, StreetId } from "./network.ts";
import { UseKind } from "./places.ts";
import type { BuildingId, UseId } from "./places.ts";

export type SoundEmitterId = `emitter:${string}`;

export enum SoundCue {
  SoftRain = "soft_rain",
  RainOnLeaves = "rain_on_leaves",
  EaveDrips = "eave_drips",
  GutterTrickle = "gutter_trickle",
  PuddleDrops = "puddle_drops",
  FoliageRustle = "foliage_rustle",
  DistantBirds = "distant_birds",
  WetStoneFootsteps = "wet_stone_footsteps",
  WetPavementFootsteps = "wet_pavement_footsteps",
  WetGravelFootsteps = "wet_gravel_footsteps",
  DampLeafFootsteps = "damp_leaf_footsteps",
  PassingCar = "passing_car",
  PassingBicycle = "passing_bicycle",
  PassingBus = "passing_bus",
  PassingPeople = "passing_people",
  DoorLatch = "door_latch",
  DoorOpening = "door_opening",
  DoorChime = "door_chime",
  DoorstepFootsteps = "doorstep_footsteps",
  IndoorFootsteps = "indoor_footsteps",
  StairwellFootsteps = "stairwell_footsteps",
  CafeChatter = "cafe_chatter",
  RestaurantMurmur = "restaurant_murmur",
  LibraryMurmur = "library_murmur",
  HouseholdMurmur = "household_murmur",
  HeavyEntranceDoor = "heavy_entrance_door",
  AdultVoices = "adult_voices",
  AdultLaughter = "adult_laughter",
  Movement = "movement",
  MilkSteamer = "milk_steamer",
  CupAndSaucer = "cup_and_saucer",
  DishClink = "dish_clink",
  ChairMovement = "chair_movement",
  PageTurn = "page_turn",
  PaperBagRustle = "paper_bag_rustle",
  TraySlide = "tray_slide",
  CrateSetDown = "crate_set_down",
  RollingBag = "rolling_bag",
  ToolTap = "tool_tap",
  ToolScrape = "tool_scrape",
  BoxSetDown = "box_set_down",
  ChildrenLaughter = "children_laughter",
  ChildrenCalls = "children_calls",
  ChildrenVoices = "children_voices",
  BellToll = "bell_toll",
  ChoralChant = "choral_chant",
  Organ = "organ",
  BusBrakes = "bus_brakes",
  BusDoor = "bus_door",
  BusIdle = "bus_idle",
  BusPullAway = "bus_pull_away",
}

export type TownSoundCue = Exclude<SoundCue, SoundCue.SoftRain>;

const quietInteriorSounds = [SoundCue.DoorOpening, SoundCue.IndoorFootsteps, SoundCue.AdultVoices] as const;

export const USE_SOUND_CUES = {
  [UseKind.House]: [SoundCue.DoorLatch, SoundCue.DoorOpening, SoundCue.DoorstepFootsteps, SoundCue.AdultVoices],
  [UseKind.Flats]: [SoundCue.DoorOpening, SoundCue.StairwellFootsteps, SoundCue.AdultVoices],
  [UseKind.Office]: [SoundCue.AdultVoices, SoundCue.ChairMovement, SoundCue.DoorstepFootsteps],
  [UseKind.Shop]: [SoundCue.DoorChime, SoundCue.AdultVoices],
  [UseKind.Cafe]: [SoundCue.AdultVoices, SoundCue.AdultLaughter, SoundCue.MilkSteamer, SoundCue.CupAndSaucer],
  [UseKind.Restaurant]: [SoundCue.AdultVoices, SoundCue.DishClink],
  [UseKind.Bookshop]: [SoundCue.DoorOpening, SoundCue.DoorChime, SoundCue.PageTurn, SoundCue.ChairMovement],
  [UseKind.Bakery]: [SoundCue.PaperBagRustle, SoundCue.TraySlide, SoundCue.AdultVoices],
  [UseKind.Grocer]: [SoundCue.PaperBagRustle, SoundCue.CrateSetDown, SoundCue.AdultVoices],
  [UseKind.Guesthouse]: [SoundCue.DoorLatch, SoundCue.AdultVoices, SoundCue.RollingBag],
  [UseKind.Workshop]: [SoundCue.ToolTap, SoundCue.ToolScrape, SoundCue.Movement],
  [UseKind.MarketHall]: [SoundCue.AdultVoices, SoundCue.Movement, SoundCue.BoxSetDown],
  [UseKind.School]: [SoundCue.ChildrenVoices, SoundCue.DoorstepFootsteps],
  [UseKind.Library]: [SoundCue.PageTurn, SoundCue.ChairMovement, SoundCue.AdultVoices],
  [UseKind.Church]: [SoundCue.BellToll, SoundCue.ChoralChant, SoundCue.Organ],
  [UseKind.TownHall]: quietInteriorSounds,
  [UseKind.Clinic]: quietInteriorSounds,
  [UseKind.Park]: [SoundCue.ChildrenLaughter, SoundCue.ChildrenCalls],
  [UseKind.BusStop]: [SoundCue.WetPavementFootsteps, SoundCue.BusBrakes, SoundCue.BusDoor, SoundCue.BusIdle, SoundCue.BusPullAway],
  [UseKind.ParkPavilion]: [SoundCue.IndoorFootsteps, SoundCue.AdultVoices],
} as const satisfies Readonly<Record<UseKind, NonEmpty<TownSoundCue>>>;

interface StreetSoundOptions {
  readonly cues: NonEmpty<TownSoundCue>;
  readonly throughRouteCues?: NonEmpty<TownSoundCue>;
}

export const STREET_SOUND_CUES: Readonly<Record<StreetProfile, StreetSoundOptions>> = {
  [StreetProfile.OldTown]: {
    cues: [SoundCue.WetStoneFootsteps, SoundCue.PassingPeople, SoundCue.PassingCar, SoundCue.PassingBicycle],
  },
  [StreetProfile.CivicSquare]: {
    cues: [SoundCue.WetStoneFootsteps, SoundCue.PassingPeople],
    throughRouteCues: [SoundCue.PassingCar, SoundCue.PassingBus],
  },
  [StreetProfile.Terraced]: {
    cues: [SoundCue.WetPavementFootsteps, SoundCue.PuddleDrops, SoundCue.PassingCar],
  },
  [StreetProfile.Garden]: {
    cues: [SoundCue.DampLeafFootsteps, SoundCue.WetGravelFootsteps, SoundCue.PassingBicycle, SoundCue.PassingCar],
  },
  [StreetProfile.VillageEdge]: {
    cues: [SoundCue.WetGravelFootsteps, SoundCue.WetPavementFootsteps],
    throughRouteCues: [SoundCue.PassingCar, SoundCue.PassingBus],
  },
};

export enum MixGroup {
  Rain = "rain",
  Town = "town",
}

export enum EmitterPlacement {
  Indoor = "indoor",
  Outdoor = "outdoor",
}

export enum EmitterSourceKind {
  Use = "use",
  Street = "street",
  Footpath = "footpath",
  Building = "building",
  Tree = "tree",
  Environment = "environment",
}

export type EmitterSource =
  | { readonly kind: EmitterSourceKind.Use; readonly useId: UseId }
  | { readonly kind: EmitterSourceKind.Street; readonly streetId: StreetId }
  | { readonly kind: EmitterSourceKind.Footpath; readonly footpathId: FootpathId }
  | { readonly kind: EmitterSourceKind.Building; readonly buildingId: BuildingId }
  | { readonly kind: EmitterSourceKind.Tree; readonly treeId: TreeId }
  | { readonly kind: EmitterSourceKind.Environment };

export enum EmitterMotionKind {
  Stationary = "stationary",
  AlongPath = "along_path",
}

export type EmitterMotion =
  | { readonly kind: EmitterMotionKind.Stationary; readonly position: ScenePosition }
  | { readonly kind: EmitterMotionKind.AlongPath; readonly path: Polyline<ScenePosition> };

export interface SoundProfile {
  readonly cues: NonEmpty<TownSoundCue>;
  readonly gapMs: NumberRange;
  readonly gain: number;
}

export interface SoundEmitter {
  readonly id: SoundEmitterId;
  readonly group: MixGroup.Town;
  readonly source: EmitterSource;
  readonly buildingType?: BuildingType;
  readonly placement: EmitterPlacement;
  readonly motion: EmitterMotion;
  readonly profile: SoundProfile;
}

export interface RainBed {
  readonly group: MixGroup.Rain;
  readonly cue: SoundCue.SoftRain;
  readonly gain: number;
}

export interface Soundscape {
  readonly rain: RainBed;
  readonly emitters: readonly SoundEmitter[];
}

export enum SoundLicense {
  Original = "original",
  CC0 = "CC0-1.0",
}

interface SoundTakeMetadata {
  readonly url: string;
  readonly creator: string;
  readonly edits?: string;
  readonly loop?: { readonly start: number; readonly end: number };
}

export type SoundTake = SoundTakeMetadata & (
  | { readonly license: SoundLicense.Original; readonly sourceUrl?: string }
  | { readonly license: SoundLicense.CC0; readonly sourceUrl: string }
);

/** Each cue groups recordings of the same sound. */
export type SoundAssets = Readonly<Partial<Record<SoundCue, NonEmpty<SoundTake>>>>;

export interface Listener {
  readonly position: ScenePosition;
  readonly targetPosition: ScenePosition;
}
