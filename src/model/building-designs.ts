import type { AssetVariant, GroundedAssetFrame, ImageLayer, PixelPoint, PixelRect } from "./assets.ts";
import type { NonEmpty, NumberRange } from "./geometry.ts";
import { StreetProfile } from "./network.ts";
import type { BuildingUse } from "./places.ts";

export enum BuildingType {
  DetachedHouse = "detached-house",
  SemiDetachedPair = "semi-detached-pair",
  TerracedHouse = "terraced-house",
  Flats = "flats",
  ShopHouse = "shop-house",
  Cafe = "cafe",
  Restaurant = "restaurant",
  Bookshop = "bookshop",
  Bakery = "bakery",
  Grocer = "grocer",
  Office = "office",
  Library = "library",
  Church = "church",
  School = "school",
  TownHall = "town-hall",
  Clinic = "clinic",
  Guesthouse = "guesthouse",
  Workshop = "workshop",
  MarketHall = "market-hall",
  ParkPavilion = "park-pavilion",
}

interface BuildingTypeDefaults {
  readonly profiles: NonEmpty<StreetProfile>;
  readonly lotCount: NumberRange;
}

const { OldTown, CivicSquare, Terraced, Garden, VillageEdge } = StreetProfile;

export const BUILDING_TYPE_DEFAULTS = {
  [BuildingType.DetachedHouse]: { profiles: [Garden, VillageEdge], lotCount: { min: 1, max: 1 } },
  [BuildingType.SemiDetachedPair]: { profiles: [Terraced, Garden, VillageEdge], lotCount: { min: 2, max: 2 } },
  [BuildingType.TerracedHouse]: { profiles: [OldTown, Terraced], lotCount: { min: 1, max: 1 } },
  [BuildingType.Flats]: { profiles: [OldTown, CivicSquare, Terraced, Garden], lotCount: { min: 1, max: 2 } },
  [BuildingType.ShopHouse]: { profiles: [OldTown, CivicSquare, Terraced], lotCount: { min: 1, max: 2 } },
  [BuildingType.Cafe]: { profiles: [OldTown, CivicSquare, Terraced, Garden, VillageEdge], lotCount: { min: 1, max: 2 } },
  [BuildingType.Restaurant]: { profiles: [OldTown, CivicSquare, Terraced, VillageEdge], lotCount: { min: 1, max: 2 } },
  [BuildingType.Bookshop]: { profiles: [OldTown, CivicSquare, Terraced], lotCount: { min: 1, max: 2 } },
  [BuildingType.Bakery]: { profiles: [OldTown, CivicSquare, Terraced, Garden, VillageEdge], lotCount: { min: 1, max: 2 } },
  [BuildingType.Grocer]: { profiles: [OldTown, CivicSquare, Terraced, Garden, VillageEdge], lotCount: { min: 1, max: 2 } },
  [BuildingType.Office]: { profiles: [OldTown, CivicSquare, Terraced], lotCount: { min: 1, max: 2 } },
  [BuildingType.Library]: { profiles: [OldTown, CivicSquare, Terraced, Garden], lotCount: { min: 2, max: 2 } },
  [BuildingType.Church]: { profiles: [OldTown, CivicSquare, Terraced, Garden, VillageEdge], lotCount: { min: 2, max: 2 } },
  [BuildingType.School]: { profiles: [CivicSquare, Terraced, Garden, VillageEdge], lotCount: { min: 3, max: 3 } },
  [BuildingType.TownHall]: { profiles: [OldTown, CivicSquare], lotCount: { min: 2, max: 2 } },
  [BuildingType.Clinic]: { profiles: [OldTown, CivicSquare, Terraced, Garden], lotCount: { min: 1, max: 2 } },
  [BuildingType.Guesthouse]: { profiles: [OldTown, CivicSquare, Garden, VillageEdge], lotCount: { min: 1, max: 2 } },
  [BuildingType.Workshop]: { profiles: [OldTown, Terraced, Garden, VillageEdge], lotCount: { min: 1, max: 2 } },
  [BuildingType.MarketHall]: { profiles: [OldTown, CivicSquare, VillageEdge], lotCount: { min: 2, max: 3 } },
  [BuildingType.ParkPavilion]: { profiles: [CivicSquare, Terraced, Garden, VillageEdge], lotCount: { min: 1, max: 1 } },
} as const satisfies Readonly<Record<BuildingType, BuildingTypeDefaults>>;

type CompatibleProfile<Type extends BuildingType> = (typeof BUILDING_TYPE_DEFAULTS)[Type]["profiles"][number];

export type BuildingDesignId = {
  [Type in BuildingType]: `buildings/${Type}/${CompatibleProfile<Type>}/${AssetVariant}`;
}[BuildingType];

export enum WallSide {
  Left = "left",
  Right = "right",
}

export enum BuildingMaterial {
  Stone = "stone",
  Timber = "timber",
  Plaster = "plaster",
  Brick = "brick",
  Slate = "slate",
  ClayTile = "clay_tile",
}

export enum RoofShape {
  Gable = "gable",
  Hipped = "hipped",
  Shed = "shed",
}

export interface FacadeDesign {
  readonly material: BuildingMaterial;
  readonly textureUrl?: string;
}

export interface RoofDesign {
  readonly shape: RoofShape;
  readonly material: BuildingMaterial;
  readonly textureUrl?: string;
}

export enum BuildingAnchorKind {
  Entrance = "entrance",
  Window = "window",
  Tower = "tower",
  ServiceDoor = "service_door",
}

export interface BuildingAnchor {
  readonly id: string;
  readonly kind: BuildingAnchorKind;
  readonly positionPx: PixelPoint;
  readonly use?: BuildingUse["kind"];
}

export interface FloorUseDesign {
  readonly kind: BuildingUse["kind"];
  readonly floors: NonEmpty<number>;
}

export enum WindowFamily {
  Sash = "narrow-sash",
  Casement = "paired-casement",
  Shopfront = "wide-shopfront",
  Dormer = "small-dormer",
  Arched = "arched-pane",
  Stairwell = "tall-stairwell",
}

export enum WindowActivity {
  Walking = "walking",
  Pausing = "pausing",
  Sitting = "sitting",
  Rising = "rising",
  Curtain = "curtain",
  Blind = "blind",
}

export interface WindowDesign {
  readonly id: string;
  readonly roomId: string;
  readonly use: BuildingUse["kind"];
  readonly family: WindowFamily;
  readonly rectPx: PixelRect;
  readonly mask: string;
  readonly unlitInterior: ImageLayer;
  readonly litInterior: ImageLayer;
  readonly glass?: ImageLayer;
  readonly frame: ImageLayer;
  readonly activityLayers?: Readonly<Partial<Record<WindowActivity, ImageLayer>>>;
}

export interface BuildingDesign extends GroundedAssetFrame {
  readonly id: BuildingDesignId;
  readonly type: BuildingType;
  readonly profile: StreetProfile;
  readonly variant: AssetVariant;
  readonly typicalLotCount: number;
  readonly referenceSizeUnits: readonly [width: number, height: number];
  readonly frontageRangeUnits: NumberRange;
  readonly groundSpanXPx: readonly [left: number, right: number];
  readonly wallContacts: readonly WallSide[];
  readonly shell: string;
  readonly endWalls?: Readonly<Partial<Record<WallSide, ImageLayer>>>;
  readonly facade: FacadeDesign;
  readonly roof: RoofDesign;
  readonly floorUses: NonEmpty<FloorUseDesign>;
  readonly anchors: readonly BuildingAnchor[];
  readonly windows: readonly WindowDesign[];
}
