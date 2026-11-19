import { UseKind } from "../model/places.ts";
import type { Building, Polygon, Scene, Town, Tree } from "../model/index.ts";
import type { SceneViewport } from "../viewport.ts";

const matte = "#242c2b";

function tracePolygon(context: CanvasRenderingContext2D, [first, ...points]: Polygon): void {
  context.beginPath();
  context.moveTo(first.x, first.y);
  for (const point of points) {
    context.lineTo(point.x, point.y);
  }
  context.closePath();
}

function paintLandscape(context: CanvasRenderingContext2D, town: Town): void {
  const { min, max } = town.bounds;
  const width = max.x - min.x;
  const height = max.y - min.y;
  const sky = context.createLinearGradient(0, min.y, 0, min.y + height * 0.72);
  sky.addColorStop(0, "#849897");
  sky.addColorStop(0.5, "#aab6ae");
  sky.addColorStop(1, "#d3d0bb");
  context.fillStyle = sky;
  context.fillRect(min.x, min.y, width, height);

  for (const hill of town.terrain.hills) {
    tracePolygon(context, hill.silhouette);
    context.fillStyle = `rgba(83, 110, 102, ${0.15 + (1 - hill.depth) * 0.6})`;
    context.fill();
  }

  const [first, ...elevations] = town.terrain.groundProfiles[0].elevations;
  context.beginPath();
  context.moveTo(first.x, first.y);
  for (const point of elevations) {
    context.lineTo(point.x, point.y);
  }
  context.lineTo(max.x, max.y);
  context.lineTo(min.x, max.y);
  context.closePath();
  const ground = context.createLinearGradient(0, min.y + height * 0.68, 0, max.y);
  ground.addColorStop(0, "#8f9278");
  ground.addColorStop(1, "#535e4f");
  context.fillStyle = ground;
  context.fill();

  const road = context.createLinearGradient(0, min.y + height * 0.73, 0, min.y + height * 0.9);
  road.addColorStop(0, "#969b90");
  road.addColorStop(1, "#5f6d69");
  for (const street of town.network.streets) {
    for (const segment of street.segments) {
      tracePolygon(context, segment.roadOutline);
      context.fillStyle = road;
      context.fill();
      context.strokeStyle = "#b1ae99";
      context.lineWidth = 6;
      context.stroke();
    }
  }

  for (const puddle of town.puddles) {
    tracePolygon(context, puddle.outline);
    const reflection = context.createLinearGradient(0, puddle.position.y - 24, 0, puddle.position.y + 38);
    reflection.addColorStop(0, "rgba(216, 204, 174, 0.48)");
    reflection.addColorStop(1, "rgba(153, 173, 163, 0.2)");
    context.fillStyle = reflection;
    context.fill();
  }
}

function paintWindow(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
  const frame = Math.min(width, height) * 0.075;
  context.fillStyle = "#4b4940";
  context.fillRect(x, y, width, height);

  const glass = context.createLinearGradient(0, y, 0, y + height);
  glass.addColorStop(0, "#918467");
  glass.addColorStop(0.65, "#c69f69");
  glass.addColorStop(1, "#ddbc83");
  context.fillStyle = glass;
  context.fillRect(x + frame, y + frame, width - frame * 2, height - frame * 2);
  context.fillStyle = "#605849";
  context.fillRect(x + width / 2 - frame / 2, y, frame, height);
  context.fillRect(x, y + height * 0.36, width, frame);
}

function paintBuilding(context: CanvasRenderingContext2D, building: Building): void {
  const { width, height, position } = building;
  const left = position.x - width / 2;
  const top = position.y - height;
  const eaves = top + height * 0.28;
  const wallHeight = position.y - eaves;

  context.save();
  tracePolygon(context, building.silhouette);
  context.clip();

  const brickwork = context.createLinearGradient(left, 0, left + width, 0);
  brickwork.addColorStop(0, "#a59980");
  brickwork.addColorStop(0.38, "#d3bfa0");
  brickwork.addColorStop(1, "#baaa8e");
  context.fillStyle = brickwork;
  context.fillRect(left, eaves, width, wallHeight);

  const roof = context.createLinearGradient(0, top, 0, eaves);
  roof.addColorStop(0, "#687272");
  roof.addColorStop(1, "#414d4e");
  context.fillStyle = roof;
  context.fillRect(left, top, width, eaves - top);
  context.fillStyle = "rgba(162, 178, 172, 0.24)";
  for (let y = top + height * 0.06; y < eaves; y += height * 0.044) {
    context.fillRect(left, y, width, Math.max(2, height * 0.005));
  }
  context.fillStyle = "#595b50";
  context.fillRect(left, eaves, width, wallHeight * 0.025);

  const windowY = eaves + wallHeight * 0.1;
  for (const offset of [0.16, 0.43, 0.7]) {
    const windowX = left + width * offset;
    paintWindow(context, windowX, windowY, width * 0.14, wallHeight * 0.28);
    context.fillStyle = "#998970";
    context.fillRect(windowX - width * 0.01, windowY + wallHeight * 0.28, width * 0.16, wallHeight * 0.018);
  }

  if (building.uses.some((use) => use.kind === UseKind.Cafe)) {
    const shopY = eaves + wallHeight * 0.52;
    const shopHeight = position.y - shopY;
    context.fillStyle = "#374c46";
    context.fillRect(left + width * 0.07, shopY, width * 0.86, shopHeight);
    context.fillStyle = "#53695e";
    context.fillRect(left + width * 0.055, shopY, width * 0.89, shopHeight * 0.25);

    context.fillStyle = "#ebd9b9";
    context.font = `600 ${width * 0.041}px Georgia, serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("CAFÉ", position.x, shopY + shopHeight * 0.127);

    const glassY = shopY + shopHeight * 0.29;
    paintWindow(context, left + width * 0.11, glassY, width * 0.26, shopHeight * 0.55);
    paintWindow(context, left + width * 0.4, glassY, width * 0.27, shopHeight * 0.55);
    paintWindow(context, left + width * 0.72, glassY, width * 0.137, shopHeight * 0.67);
  }

  context.restore();
  tracePolygon(context, building.silhouette);
  context.strokeStyle = "rgba(49, 62, 59, 0.6)";
  context.lineWidth = 5;
  context.stroke();
}

function paintTree(context: CanvasRenderingContext2D, tree: Tree): void {
  const { x, y } = tree.position;
  const { crownSpread: width, height } = tree;
  tracePolygon(context, [
    { x: x - width * 0.04, y }, { x: x - width * 0.025, y: y - height * 0.29 },
    { x: x - width * 0.24, y: y - height * 0.58 }, { x: x - width * 0.18, y: y - height * 0.58 },
    { x: x, y: y - height * 0.41 }, { x: x + width * 0.16, y: y - height * 0.65 },
    { x: x + width * 0.22, y: y - height * 0.63 }, { x: x + width * 0.05, y: y - height * 0.33 },
    { x: x + width * 0.025, y },
  ]);
  context.fillStyle = "#5e5344";
  context.fill();

  const crown = tree.silhouette;
  const first = crown[0];
  const last = crown.at(-1) ?? first;
  context.beginPath();
  context.moveTo((first.x + last.x) / 2, (first.y + last.y) / 2);
  for (const [index, point] of crown.entries()) {
    const next = crown[index + 1] ?? first;
    context.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
  }
  context.closePath();
  const foliage = context.createRadialGradient(
    x - width * 0.17, y - height * 0.82, width * 0.08,
    x, y - height * 0.7, width * 0.56,
  );
  foliage.addColorStop(0, "#c49759");
  foliage.addColorStop(0.56, "#a97b4a");
  foliage.addColorStop(1, "#766149");
  context.fillStyle = foliage;
  context.fill();
}

export function drawScene(context: CanvasRenderingContext2D, scene: Scene, viewport: SceneViewport): void {
  const { width, height } = context.canvas;
  const pixelScaleX = width / viewport.width;
  const pixelScaleY = height / viewport.height;

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = matte;
  context.fillRect(0, 0, width, height);
  context.save();
  context.setTransform(
    viewport.scale * pixelScaleX, 0, 0, viewport.scale * pixelScaleY,
    viewport.offsetX * pixelScaleX, viewport.offsetY * pixelScaleY,
  );
  const { min, max } = viewport.bounds;
  context.beginPath();
  context.rect(min.x, min.y, max.x - min.x, max.y - min.y);
  context.clip();

  paintLandscape(context, scene.town);
  for (const building of scene.town.buildings) {
    paintBuilding(context, building);
  }
  for (const tree of scene.town.vegetation.trees) {
    paintTree(context, tree);
  }
  context.restore();
}
