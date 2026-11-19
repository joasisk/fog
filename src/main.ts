import { createCafeScene } from "./generation/cafe-scene.ts";
import { bindScenePointer } from "./input/scene-pointer.ts";
import { drawScene } from "./rendering/canvas-scene.ts";
import { fitScene } from "./viewport.ts";
import type { SceneViewport } from "./viewport.ts";

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
if (!canvas) {
  throw new Error("Fog needs a scene canvas.");
}

const context = canvas.getContext("2d", { alpha: false });
if (!context) {
  throw new Error("Fog needs Canvas 2D to draw the scene.");
}

const scene = createCafeScene();
let viewport: SceneViewport | null = null;

const resize = () => {
  const { width, height } = canvas.getBoundingClientRect();
  viewport = fitScene(scene.town.bounds, width, height);
  if (!viewport) {
    return;
  }

  const ratio = window.devicePixelRatio;
  const pixelWidth = Math.max(1, Math.round(width * ratio));
  const pixelHeight = Math.max(1, Math.round(height * ratio));
  if (canvas.width !== pixelWidth) {
    canvas.width = pixelWidth;
  }
  if (canvas.height !== pixelHeight) {
    canvas.height = pixelHeight;
  }
  drawScene(context, scene, viewport);
};

bindScenePointer(canvas, () => viewport);
resize();
new ResizeObserver(resize).observe(canvas);
window.addEventListener("resize", resize);
