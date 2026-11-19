import type { AssetFrame, AssetVariant, GroundedAssetFrame, ImageLayer, PixelPoint } from "./assets.ts";
import type {
  DepthLayer,
  NonEmpty,
  Point2D,
  Polygon,
  Polyline,
  SceneBounds,
  ScenePosition,
} from "./geometry.ts";

export type TreeId = `tree:${string}`;

export interface TerrainProfile {
  readonly depth: number;
  readonly elevations: Polyline;
}

export interface Hill {
  readonly silhouette: Polygon;
  readonly depth: number;
  readonly layer: DepthLayer;
}

export interface Terrain {
  readonly groundProfiles: NonEmpty<TerrainProfile>;
  readonly hills: readonly Hill[];
}

export enum FoliageColor {
  RustRed = "rust_red",
  BurntOrange = "burnt_orange",
  Crimson = "crimson",
  Gold = "gold",
  Amber = "amber",
  Ochre = "ochre",
  Copper = "copper",
  WetBrown = "wet_brown",
  Olive = "olive",
  MutedGreen = "muted_green",
  SilveryGreen = "silvery_green",
  DeepGreen = "deep_green",
  BlueGreen = "blue_green",
}

export enum TreeSpecies {
  EnglishOak = "oak",
  EuropeanBeech = "beech",
  SilverBirch = "birch",
  NorwayMaple = "norway-maple",
  HorseChestnut = "horse-chestnut",
  EuropeanHornbeam = "hornbeam",
  SmallLeavedLime = "small-leaved-lime",
  Rowan = "rowan",
  WildCherry = "wild-cherry",
  EuropeanAsh = "ash",
  BlackAlder = "black-alder",
  WhiteWillow = "white-willow",
  EuropeanLarch = "larch",
  ScotsPine = "scots-pine",
  NorwaySpruce = "norway-spruce",
}

export enum TreeStage {
  Sapling = "sapling",
  Young = "young",
  Mature = "mature",
  Old = "old",
}

export type TreeDesignId = `trees/${TreeSpecies}/${TreeStage}/${AssetVariant}`;

export interface TreeDesign extends GroundedAssetFrame {
  readonly id: TreeDesignId;
  readonly species: TreeSpecies;
  readonly stage: TreeStage;
  readonly variant: AssetVariant;
  readonly referenceHeightUnits: number;
  readonly referenceCrownSpreadUnits: number;
  readonly trunkLayer: ImageLayer;
  readonly foliageLayer: ImageLayer;
  readonly berryLayer?: ImageLayer;
  readonly sparseFoliageMask?: string;
  readonly compatibleFoliage: NonEmpty<FoliageColor>;
}

export interface Tree {
  readonly id: TreeId;
  readonly designId: TreeDesignId;
  readonly position: ScenePosition;
  readonly layer: DepthLayer;
  readonly height: number;
  readonly crownSpread: number;
  readonly foliageColor: FoliageColor;
  readonly silhouette: Polygon;
}

export interface WoodedPatch {
  readonly boundary: Polygon<ScenePosition>;
  readonly treeIds: NonEmpty<TreeId>;
}

export interface Vegetation {
  readonly trees: readonly Tree[];
  readonly woodedPatches: readonly WoodedPatch[];
}

export enum DecorationFamily {
  Hawthorn = "hawthorn",
  Hazel = "hazel",
  DogRose = "dog-rose",
  Elder = "elder",
  Privet = "privet",
  Yew = "yew",
  Holly = "holly",
  Hydrangea = "hydrangea",
  Aster = "aster",
  Chrysanthemum = "chrysanthemum",
  AutumnCyclamen = "autumn-cyclamen",
  Heather = "heather",
  Stonecrop = "stonecrop",
  DriedSeedheads = "dried-seedheads",
  GrassTuft = "grass-tuft",
  Reeds = "reeds",
  Fern = "fern",
  Ivy = "ivy",
  StoneWall = "stone-wall",
  WoodenFence = "wooden-fence",
  Planter = "planter",
  Lamp = "lamp",
  Bench = "bench",
  Bollard = "bollard",
  RainBarrel = "rain-barrel",
  LeafPile = "leaf-pile",
  StoneSteps = "stone-steps",
  Puddle = "puddle",
}

export enum DecorationAnchorKind {
  Ground = "ground",
  Wall = "wall",
}

export type DecorationVariant = AssetVariant.V01 | AssetVariant.V02 | AssetVariant.V03;
export type DecorationDesignId = `decorations/${DecorationFamily}/${DecorationVariant}`;

export interface DecorationDesign extends AssetFrame {
  readonly id: DecorationDesignId;
  readonly family: DecorationFamily;
  readonly variant: DecorationVariant;
  readonly anchor: { readonly kind: DecorationAnchorKind; readonly positionPx: PixelPoint };
  readonly image: ImageLayer;
  readonly tintMask?: string;
  readonly joinPointsPx?: readonly PixelPoint[];
}

export interface Decoration {
  readonly designId: DecorationDesignId;
  readonly position: ScenePosition;
  readonly layer: DepthLayer;
  readonly scale: number;
}

export interface Puddle {
  readonly position: ScenePosition;
  readonly outline: Polygon;
}

export interface FogBank {
  readonly bounds: SceneBounds;
  readonly layer: DepthLayer;
  readonly depth: number;
  readonly driftPerSecond: Point2D;
  /** Opacity ranges from zero to one. */
  readonly opacity: number;
}

export interface Rain {
  readonly dropsPerSecond: number;
  readonly velocity: Point2D;
}

export interface Weather {
  readonly rain: Rain;
  readonly fogBanks: NonEmpty<FogBank>;
}
