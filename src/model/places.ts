import type { BuildingDesignId } from "./building-designs.ts";
import type { DepthLayer, NonEmpty, Polygon, ScenePosition } from "./geometry.ts";
import type { FrontageInterval, FrontageSectionId } from "./network.ts";

export type LotId = `lot:${string}`;
export type SiteId = `site:${string}`;
export type BuildingId = `building:${string}`;
export type UseId = `use:${string}`;

export enum UseCategory {
  Residential = "residential",
  CommercialAndOffice = "commercial_and_office",
  Civic = "civic",
  PublicSpaceAndTransit = "public_space_and_transit",
}

export enum UseKind {
  House = "house",
  Flats = "flats",
  Office = "office",
  Shop = "shop",
  Cafe = "cafe",
  Restaurant = "restaurant",
  Bookshop = "bookshop",
  Bakery = "bakery",
  Grocer = "grocer",
  Guesthouse = "guesthouse",
  Workshop = "workshop",
  MarketHall = "market_hall",
  School = "school",
  Library = "library",
  Church = "church",
  TownHall = "town_hall",
  Clinic = "clinic",
  Park = "park",
  BusStop = "bus_stop",
  ParkPavilion = "park_pavilion",
}

export const USE_CATEGORIES = {
  [UseKind.House]: UseCategory.Residential,
  [UseKind.Flats]: UseCategory.Residential,
  [UseKind.Office]: UseCategory.CommercialAndOffice,
  [UseKind.Shop]: UseCategory.CommercialAndOffice,
  [UseKind.Cafe]: UseCategory.CommercialAndOffice,
  [UseKind.Restaurant]: UseCategory.CommercialAndOffice,
  [UseKind.Bookshop]: UseCategory.CommercialAndOffice,
  [UseKind.Bakery]: UseCategory.CommercialAndOffice,
  [UseKind.Grocer]: UseCategory.CommercialAndOffice,
  [UseKind.Guesthouse]: UseCategory.CommercialAndOffice,
  [UseKind.Workshop]: UseCategory.CommercialAndOffice,
  [UseKind.MarketHall]: UseCategory.CommercialAndOffice,
  [UseKind.School]: UseCategory.Civic,
  [UseKind.Library]: UseCategory.Civic,
  [UseKind.Church]: UseCategory.Civic,
  [UseKind.TownHall]: UseCategory.Civic,
  [UseKind.Clinic]: UseCategory.Civic,
  [UseKind.Park]: UseCategory.PublicSpaceAndTransit,
  [UseKind.BusStop]: UseCategory.PublicSpaceAndTransit,
  [UseKind.ParkPavilion]: UseCategory.PublicSpaceAndTransit,
} as const satisfies Readonly<Record<UseKind, UseCategory>>;

export type ResidentialUseKind = UseKind.House | UseKind.Flats;
export type PublicSiteUseKind = UseKind.Park | UseKind.BusStop;
export type ServiceUseKind = UseKind.School | PublicSiteUseKind;

export interface FloorSpace {
  /** Ground level is floor zero. */
  readonly level: number;
  /** If supplied, this use occupies only this part of the floor. */
  readonly area?: Polygon<ScenePosition>;
}

interface BuildingUseLocation {
  readonly id: UseId;
  readonly floors: NonEmpty<FloorSpace>;
}

export type BuildingUse = BuildingUseLocation & (
  | { readonly kind: ResidentialUseKind; readonly dwellingCount: number }
  | { readonly kind: UseKind.School; readonly serviceCapacity: number; readonly yard?: Polygon<ScenePosition> }
  | { readonly kind: Exclude<UseKind, ResidentialUseKind | ServiceUseKind> }
);

export interface PublicSiteUse {
  readonly id: UseId;
  readonly kind: PublicSiteUseKind;
  readonly area: Polygon<ScenePosition>;
  readonly serviceCapacity: number;
}

export type PlaceUse = BuildingUse | PublicSiteUse;

export interface Building {
  readonly id: BuildingId;
  readonly siteId: SiteId;
  readonly designId: BuildingDesignId;
  /** The ground anchor in the resolved scene. */
  readonly position: ScenePosition;
  readonly layer: DepthLayer;
  readonly footprint: Polygon<ScenePosition>;
  readonly width: number;
  readonly height: number;
  readonly floorCount: number;
  readonly silhouette: Polygon;
  readonly uses: NonEmpty<BuildingUse>;
  readonly entrances?: readonly { readonly id: string; readonly position: ScenePosition; readonly useId: UseId }[];
  readonly appearance?: {
    readonly facadeColor?: readonly [red: number, green: number, blue: number];
    readonly decorations?: readonly string[];
  };
  readonly eaveDripPositions?: readonly ScenePosition[];
}

export interface Lot {
  readonly id: LotId;
  /** A corner lot uses the frontage its site's main entrance faces. */
  readonly frontageSectionId: FrontageSectionId;
  readonly interval: FrontageInterval;
}

export interface SiteEntrance {
  readonly position: ScenePosition;
  /** The entrance's connection to the street along the segment path. */
  readonly distanceAlongSegment: number;
  /** Walkable length between the entrance and its connection, in scene units. */
  readonly distanceToStreet: number;
}

export interface SiteLocation {
  readonly id: SiteId;
  /** Consecutive lots in the same frontage section, ordered along the segment path. */
  readonly lotIds: NonEmpty<LotId>;
  readonly entrance: SiteEntrance;
  readonly setback: number;
}

export enum SiteEdgeKind {
  SharedWall = "shared_wall",
  Clearance = "clearance",
}

export type SiteEdge =
  | { readonly kind: SiteEdgeKind.SharedWall }
  | { readonly kind: SiteEdgeKind.Clearance; readonly minimum: number };

export interface BuildingLimits {
  readonly footprint: Polygon<ScenePosition>;
  readonly maxHeight: number;
  /** Edges are ordered along the owning frontage section. */
  readonly startEdge: SiteEdge;
  readonly endEdge: SiteEdge;
}

export enum SiteKind {
  Building = "building",
  PublicSpace = "public_space",
}

export interface BuildingSite extends SiteLocation {
  readonly kind: SiteKind.Building;
  readonly limits: BuildingLimits;
}

export interface PublicSite extends SiteLocation {
  readonly kind: SiteKind.PublicSpace;
  readonly uses: NonEmpty<PublicSiteUse>;
}

export type Site = BuildingSite | PublicSite;
