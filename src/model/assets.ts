import type { BuildingDesign } from "./building-designs.ts";
import type { DecorationDesign, TreeDesign } from "./landscape.ts";

export enum AssetVariant {
  V01 = "v01",
  V02 = "v02",
  V03 = "v03",
  V04 = "v04",
  V05 = "v05",
}

/** Pixel coordinates are relative to the upper left of the asset frame. */
export type PixelPoint = readonly [x: number, y: number];
export type PixelRect = readonly [x: number, y: number, width: number, height: number];

export interface AssetFrame {
  readonly framePx: readonly [width: number, height: number];
}

export interface GroundedAssetFrame extends AssetFrame {
  readonly groundAnchorPx: PixelPoint;
}

export interface ImageLayer {
  readonly url: string;
  /** Position and size within the full frame for a cropped layer. */
  readonly rectPx?: PixelRect;
}

export interface AssetCatalog {
  readonly buildings: readonly BuildingDesign[];
  readonly trees: readonly TreeDesign[];
  readonly decorations: readonly DecorationDesign[];
}
