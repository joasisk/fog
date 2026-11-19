import type { Point2D } from "../model/geometry.ts";
import { scenePointAt } from "../viewport.ts";
import type { SceneViewport } from "../viewport.ts";

export interface ScenePointerDetail {
  readonly position: Point2D | null;
  readonly pointerEvent: PointerEvent;
}

/** Emits a scenepointer event using the transform of the currently displayed frame. */
export function bindScenePointer(canvas: HTMLCanvasElement, getViewport: () => SceneViewport | null): void {
  const publish = (pointerEvent: PointerEvent) => {
    const viewport = getViewport();
    const rect = canvas.getBoundingClientRect();
    let position = null;
    if (viewport && rect.width > 0 && rect.height > 0) {
      position = scenePointAt(viewport, {
        x: (pointerEvent.clientX - rect.left) * viewport.width / rect.width,
        y: (pointerEvent.clientY - rect.top) * viewport.height / rect.height,
      });
    }
    canvas.dispatchEvent(new CustomEvent<ScenePointerDetail>("scenepointer", {
      detail: { position, pointerEvent },
    }));
  };

  canvas.addEventListener("pointermove", publish);
  canvas.addEventListener("pointerdown", publish);
}
