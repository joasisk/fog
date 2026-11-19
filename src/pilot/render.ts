import type { Point2D, SceneBounds } from "../model/geometry.ts";
import type { Building } from "../model/places.ts";
import { UseKind } from "../model/places.ts";
import type { Scene } from "../model/scene.ts";
import { height, seededRandom, shopSite, width } from "./scene.ts";

type Paint = CanvasRenderingContext2D;

function polygon(ctx: Paint, points: readonly Point2D[]) {
  ctx.beginPath();
  for (const { x, y } of points) ctx.lineTo(x, y);
  ctx.closePath();
}

function wash(ctx: Paint, x: number, y: number, rx: number, ry: number, color: string, solidCore = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  const fill = ctx.createRadialGradient(0, 0, solidCore, 0, 0, 1);
  fill.addColorStop(0, color);
  fill.addColorStop(1, "transparent");
  ctx.fillStyle = fill;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

function line(ctx: Paint, x: number, y: number, endX: number, endY: number) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
}

function windowPane(ctx: Paint, x: number, y: number, w: number, h: number, glow: string) {
  ctx.fillStyle = "#5d5348";
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#76674e";
  ctx.lineWidth = 2;
  line(ctx, x + w / 2, y, x + w / 2, y + h);
  line(ctx, x, y + h * .42, x + w, y + h * .42);
  ctx.fillStyle = "#504a42";
  ctx.fillRect(x - 5, y + h, w + 10, 4);
}

function building(ctx: Paint, building: Building) {
  const [base, eave, peak, right] = building.silhouette;
  if (!base || !eave || !peak || !right) return;
  const { x, y } = base;
  const w = building.width;
  const shop = building.siteId === shopSite;
  const cafe = building.uses[0].kind === UseKind.Cafe;
  ctx.save();
  polygon(ctx, building.silhouette);
  ctx.clip();
  const plaster = ctx.createLinearGradient(x, eave.y, x + w, y);
  plaster.addColorStop(0, shop ? "#d8c1a0" : "#a49986");
  plaster.addColorStop(1, shop ? "#a38772" : "#8f7162");
  ctx.fillStyle = plaster;
  ctx.fillRect(x, eave.y, w, y - eave.y);

  const random = seededRandom(Math.round(x));
  for (let i = 0; i < 170; i++) {
    ctx.fillStyle = random() < .5 ? "#f4dcba18" : "#573e3012";
    ctx.fillRect(x + random() * w, eave.y + random() * (y - eave.y), random() * 19 + 2, random() * 3 + 1);
  }

  polygon(ctx, [eave, peak, right]);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = shop ? "#4f4948" : "#574947";
  ctx.fillRect(x, peak.y, w, eave.y - peak.y);
  for (let row = peak.y + 8; row < eave.y; row += 8) {
    ctx.strokeStyle = "#262c3050";
    line(ctx, x, row, x + w, row + 1);
    for (let tile = x - row % 17; tile < x + w; tile += 16) {
      ctx.strokeStyle = random() < .44 ? "#b4a28e36" : "#30343735";
      line(ctx, tile, row, tile + 3, row - 7);
    }
  }
  ctx.restore();
  ctx.fillStyle = "#4e4440";
  ctx.fillRect(x, eave.y - 2, w, 6);

  if (building.floorCount > 1) {
    const count = shop ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const center = x + (i + .5) * w / count;
      windowPane(ctx, center - 19, eave.y + 28, 38, 51, i === 1 ? "#d6b477" : "#a4977a");
    }
  }
  if (shop) {
    const trim = cafe ? "#60382e" : "#284942";
    const beamY = 302;
    ctx.fillStyle = trim;
    ctx.fillRect(x + 9, beamY, w - 18, y - beamY);
    ctx.fillStyle = "rgba(235, 196, 120, .23)";
    ctx.fillRect(x + 12, beamY + 2, w - 24, 16);
    ctx.fillStyle = "#f6d9a1";
    ctx.textAlign = "center";
    ctx.font = "bold 12px Georgia, serif";
    ctx.fillText(cafe ? "CAFÉ" : "BOOKSHOP", x + w / 2, beamY + 14);
    windowPane(ctx, x + 24, 329, 112, 31, cafe ? "#edbd78" : "#d8b87b");
    windowPane(ctx, x + w - 52, 326, 29, 44, cafe ? "#dca565" : "#ad9d6f");
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = cafe ? "#67433585" : ["#625947", "#597366", "#865a4b"][i % 3]!;
      ctx.fillRect(x + 28 + i * 8, 349 - (i % 3) * 3, cafe ? 6 : 4, 11 + (i % 3) * 3);
    }
  } else {
    windowPane(ctx, x + 15, y - 52, Math.min(47, w * .34), 33, "#b49c74");
    ctx.fillStyle = "#51554d";
    ctx.fillRect(x + w - 44, y - 49, 27, 49);
    ctx.fillStyle = "#c5a779";
    ctx.fillRect(x + w - 24, y - 24, 4, 3);
  }
  ctx.restore();
}

function street(ctx: Paint, scene: Scene) {
  const ground = ctx.createLinearGradient(0, 360, 0, height);
  ground.addColorStop(0, "#76796c");
  ground.addColorStop(.54, "#555d56");
  ground.addColorStop(1, "#3e4841");
  ctx.fillStyle = ground;
  ctx.fillRect(0, 365, width, height - 365);
  for (const road of [...scene.town.network.streets].reverse().flatMap(({ segments }) => segments)) {
    polygon(ctx, road.roadOutline);
    ctx.fillStyle = road.width < 30 ? "#72796f" : "#626764";
    ctx.fill();
    ctx.strokeStyle = "#a4a097";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  const random = seededRandom(127);
  for (let i = 0; i < 530; i++) {
    const x = random() * width;
    const y = 374 + random() * 160;
    const glare = y < 450 && random() > .55;
    ctx.fillStyle = glare ? "#e2c09324" : i % 2 ? "#252e2c3c" : "#ada99724";
    ctx.fillRect(x, y, random() * (glare ? 36 : 13) + 1, random() + .7);
  }
  for (const { position, siteId } of scene.town.buildings) {
    if (siteId !== shopSite) continue;
    wash(ctx, position.x + 15, 402, 118, 23, "#e4ae6866");
    wash(ctx, position.x + 34, 439, 106, 8, "#d8a77544");
  }
}

function tree(ctx: Paint, scene: Scene) {
  const maple = scene.town.vegetation.trees[0];
  if (!maple) return;
  const { x, y } = maple.position;
  wash(ctx, x, y, 79, 14, "#262d21a0");
  ctx.fillStyle = "#413b2c";
  polygon(ctx, [
    { x: x - 18, y }, { x: x - 7, y: y - 106 }, { x: x - 21, y: y - 173 },
    { x: x - 9, y: y - 181 }, { x: x + 9, y: y - 100 }, { x: x + 15, y: y - 5 },
    { x: x + 28, y: y + 4 },
  ]);
  ctx.fill();
  const random = seededRandom(420);
  for (let i = 0; i < 19; i++) {
    const spread = (random() - .5) * maple.crownSpread;
    ctx.strokeStyle = "#4a3a2c";
    ctx.lineWidth = 2 + random() * 3;
    line(ctx, x, y - 102 - random() * 87, x + spread, y - 191 - random() * 90);
  }
  const foliage = ["#77543d", "#9d613d", "#ad7546", "#c38b50", "#965032", "#634f38"];
  for (let i = 0; i < 680; i++) {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random());
    const size = 2 + random() * 13;
    ctx.fillStyle = foliage[i % foliage.length]!;
    ctx.globalAlpha = .35 + random() * .5;
    ctx.beginPath();
    ctx.ellipse(x - 7 + Math.cos(angle) * radius * 127, y - 246 + Math.sin(angle) * radius * 95,
      size, size * .54, angle, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function landscape(ctx: Paint, scene: Scene) {
  const sky = ctx.createLinearGradient(0, 0, 0, 385);
  sky.addColorStop(0, "#627476");
  sky.addColorStop(.7, "#b5bcb0");
  sky.addColorStop(1, "#d4c8ae");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  wash(ctx, 695, 128, 360, 120, "#ded5b680");
  for (const hill of scene.town.terrain.hills) {
    polygon(ctx, hill.silhouette);
    ctx.fillStyle = "#8b9a8f";
    ctx.fill();
  }
  const random = seededRandom(291);
  for (let i = 0; i < 128; i++) {
    const x = random() * width;
    const y = 248 + Math.sin(x / 88) * 28 + random() * 41;
    wash(ctx, x, y, 26 + random() * 32, 18 + random() * 38, i % 3 ? "#6d7e6855" : "#99877955");
  }
  wash(ctx, 487, 272, 620, 95, "#d2d5c88a");
  street(ctx, scene);
  for (const site of scene.town.sites) {
    if (!("uses" in site)) continue;
    for (const use of site.uses) {
      if (use.kind !== UseKind.Park) continue;
      polygon(ctx, use.area);
      ctx.fillStyle = "#626e56";
      ctx.fill();
      const { x, y } = site.entrance.position;
      const leaves = seededRandom(Math.round(x));
      for (let i = 0; i < 50; i++) {
        wash(ctx, x - 34 + leaves() * 68, y - 17 - leaves() * 51,
          8 + leaves() * 10, 5 + leaves() * 10, i % 2 ? "#abb37a80" : "#414d3999");
      }
      ctx.fillStyle = "#3e4c3b";
      ctx.fillRect(x - 19, y - 14, 38, 5);
      ctx.fillRect(x - 16, y - 10, 3, 7);
      ctx.fillRect(x + 13, y - 10, 3, 7);
    }
  }
  for (const item of scene.town.buildings) building(ctx, item);
}

export function createRenderer(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  const scenery = document.createElement("canvas");
  const foreground = document.createElement("canvas");
  for (const layer of [scenery, foreground]) {
    layer.width = width * 2;
    layer.height = height * 2;
  }
  const backgroundPaint = scenery.getContext("2d");
  const foregroundPaint = foreground.getContext("2d");
  if (!ctx || !backgroundPaint || !foregroundPaint) throw Error("Canvas 2D is unavailable.");
  backgroundPaint.scale(2, 2);
  foregroundPaint.scale(2, 2);
  let renderedScene: Scene | undefined;

  return (scene: Scene, seconds: number, cover: number, bounds?: SceneBounds, wholeTown = false) => {
    if (renderedScene !== scene) {
      landscape(backgroundPaint, scene);
      if (renderedScene?.town.vegetation !== scene.town.vegetation) {
        foregroundPaint.clearRect(0, 0, width, height);
        tree(foregroundPaint, scene);
      }
      renderedScene = scene;
    }
    const resolution = Math.min(2, window.devicePixelRatio || 1);
    const screenWidth = Math.max(1, Math.round(canvas.clientWidth * resolution));
    const screenHeight = Math.max(1, Math.round(canvas.clientHeight * resolution));
    if (canvas.width !== screenWidth || canvas.height !== screenHeight) {
      canvas.width = screenWidth;
      canvas.height = screenHeight;
    }
    ctx.setTransform(screenWidth / width, 0, 0, screenHeight / height, 0, 0);
    ctx.drawImage(scenery, 0, 0, width, height);
    for (const bank of scene.weather.fogBanks) {
      ctx.globalAlpha = bank.opacity;
      const offset = Math.sin(seconds * bank.driftPerSecond.x / 500) * 105;
      const center = (bank.bounds.min.y + bank.bounds.max.y) / 2;
      wash(ctx, 295 + offset, center - 25, 415, 95, "#e6e8d8");
      wash(ctx, 720 + offset, center + 13, 400, 76, "#dfe3d7");
    }
    ctx.globalAlpha = 1;
    if (wholeTown) ctx.drawImage(foreground, 0, 0, width, height);
    if (cover > 0 && bounds) {
      const halfWidth = (bounds.max.x - bounds.min.x) / 2;
      const halfHeight = (bounds.max.y - bounds.min.y) / 2;
      ctx.globalAlpha = cover;
      wash(ctx, bounds.min.x + halfWidth - (1 - cover) * 180, bounds.min.y + halfHeight,
        halfWidth * 2.25 + 85, halfHeight * 2.25 + 55, "#c8d1c8", .70);
    }
    ctx.globalAlpha = 1;
    if (!wholeTown) ctx.drawImage(foreground, 0, 0, width, height);
    const { dropsPerSecond, velocity } = scene.weather.rain;
    const random = seededRandom(82);
    ctx.lineWidth = .85;
    ctx.strokeStyle = "#edf2e14d";
    for (let i = 0; i < dropsPerSecond; i++) {
      const initialX = random() * width;
      const initialY = random() * height;
      const speed = .63 + random() * .37;
      const x = ((initialX + seconds * velocity.x * speed) % width + width) % width;
      const y = (initialY + seconds * velocity.y * speed) % height;
      line(ctx, x, y, x + velocity.x * .035 * speed, y + velocity.y * .035 * speed);
    }
  };
}
