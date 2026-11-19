import type { Point2D, SceneBounds } from "./model/geometry.ts";

/** A uniform scene transform measured in CSS pixels. */
export interface SceneViewport {
  readonly bounds: SceneBounds;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

export function fitScene(bounds: SceneBounds, width: number, height: number): SceneViewport | null {
  const sceneWidth = bounds.max.x - bounds.min.x;
  const sceneHeight = bounds.max.y - bounds.min.y;
  if (width <= 0 || height <= 0 || sceneWidth <= 0 || sceneHeight <= 0) {
    return null;
  }

  const scale = Math.min(width / sceneWidth, height / sceneHeight);
  return {
    bounds,
    width,
    height,
    scale,
    offsetX: (width - sceneWidth * scale) / 2 - bounds.min.x * scale,
    offsetY: (height - sceneHeight * scale) / 2 - bounds.min.y * scale,
  };
}

export function scenePointAt(viewport: SceneViewport, point: Point2D): Point2D | null {
  const x = (point.x - viewport.offsetX) / viewport.scale;
  const y = (point.y - viewport.offsetY) / viewport.scale;
  const { min, max } = viewport.bounds;
  if (x < min.x || x >= max.x || y < min.y || y >= max.y) {
    return null;
  }
  return { x, y };
}
