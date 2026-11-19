export type NonEmpty<T> = readonly [T, ...T[]];

/** Side-on scene coordinates with x increasing rightward and y increasing downward. */
export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export interface ScenePosition extends Point2D {
  /** Depth ranges from zero near the viewer to one far away. */
  readonly depth: number;
}

export interface SceneBounds {
  readonly min: Point2D;
  readonly max: Point2D;
}

export interface NumberRange {
  readonly min: number;
  readonly max: number;
}

export type Polyline<Point = Point2D> = readonly [Point, Point, ...Point[]];

/** The last vertex connects back to the first. */
export type Polygon<Point = Point2D> = readonly [Point, Point, Point, ...Point[]];

export enum DepthLayer {
  Foreground = "foreground",
  MiddleDistance = "middle_distance",
  Distance = "distance",
}
