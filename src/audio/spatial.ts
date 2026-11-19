import type { Polyline, ScenePosition } from "../model/geometry.ts";
import { EmitterPlacement } from "../model/sound.ts";

export function spatialMix(
  source: ScenePosition,
  listener: ScenePosition,
  sceneWidth: number,
  placement: EmitterPlacement,
) {
  const horizontal = (source.x - listener.x) / sceneWidth;
  const vertical = (source.y - listener.y) / sceneWidth;
  const depth = source.depth - listener.depth;
  const distance = Math.hypot(horizontal, vertical, depth * 0.6);
  const indoor = placement === EmitterPlacement.Indoor;

  return {
    pan: Math.max(-1, Math.min(1, horizontal * 4)),
    gain: (indoor ? 0.75 : 1) / (1 + (distance * 5) ** 2),
    cutoff: 450 + ((indoor ? 3500 : 16000) - 450) / (1 + distance * 8),
  };
}

export function interpolatePosition(from: ScenePosition, to: ScenePosition, fraction: number): ScenePosition {
  return {
    x: from.x + (to.x - from.x) * fraction,
    y: from.y + (to.y - from.y) * fraction,
    depth: from.depth + (to.depth - from.depth) * fraction,
  };
}

export function pathMotion(path: Polyline<ScenePosition>, sceneWidth: number) {
  const segments: { from: ScenePosition; to: ScenePosition; length: number; start: number }[] = [];
  let totalLength = 0;
  let from = path[0];

  for (const to of path.slice(1)) {
    const length = Math.hypot(to.x - from.x, to.y - from.y, (to.depth - from.depth) * sceneWidth * 0.6);
    if (length > 0) {
      segments.push({ from, to, length, start: totalLength });
      totalLength += length;
    }
    from = to;
  }

  return (progress: number): ScenePosition => {
    const distance = Math.max(0, Math.min(1, progress)) * totalLength;
    const segment = segments.find(({ start, length }) => distance <= start + length);
    return segment ? interpolatePosition(segment.from, segment.to, (distance - segment.start) / segment.length) : from;
  };
}
