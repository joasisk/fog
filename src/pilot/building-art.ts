import type { ImageLayer, PixelPoint, PixelRect } from "../model/assets.ts";
import { WallSide, WindowActivity } from "../model/building-designs.ts";
import type { Building } from "../model/places.ts";
import type { Scene } from "../model/scene.ts";
import type { CatalogDesign, PilotCatalog } from "./building-catalog.ts";
import { elevationTransform } from "./building-placement.ts";

function buffer(width: number, height: number, read = false) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: read });
  if (!ctx) throw Error("Canvas 2D is unavailable.");
  return ctx;
}

function tint(ctx: CanvasRenderingContext2D, value: HTMLImageElement, midtone: number,
  color: readonly [number, number, number]) {
  const { width, height } = ctx.canvas;
  const mask = buffer(width, height, true);
  mask.drawImage(value, 0, 0);
  const values = mask.getImageData(0, 0, width, height).data;
  const surface = ctx.getImageData(0, 0, width, height);
  for (let i = 0; i < values.length; i += 4) {
    const strength = values[i + 3]! / 255;
    if (!strength || !surface.data[i + 3]) continue;
    const delta = values[i]! - midtone;
    for (const [channel, base] of color.entries()) {
      const index = i + channel;
      const target = Math.min(255, Math.max(0, base + delta));
      surface.data[index] = surface.data[index]! * (1 - strength) + target * strength;
    }
  }
  ctx.putImageData(surface, 0, 0);
}

const roomOffset = (id: string) => Array.from(id).reduce((hash, char) => Math.imul(hash, 31) + char.charCodeAt(0), 0) >>> 0;

export function createBuildingArt(catalog: PilotCatalog, assetUrl: (path: string) => URL) {
  const designs = new Map(catalog.map((design) => [design.id, design]));
  const images = new Map<string, Promise<HTMLImageElement>>();
  const decoded = new Map<string, HTMLImageElement>();
  const painters = new Map<string, ReturnType<typeof preparePainter>>();

  function decode(path: string) {
    const existing = images.get(path);
    if (existing) return existing;
    const img = new Image();
    const url = assetUrl(path);
    let timeout: ReturnType<typeof setTimeout>;
    const limit = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(Error(`Timed out loading ${path}`)), 15000);
    });
    img.src = url.href;
    const result = Promise.race([img.decode(), limit]).then(() => {
      decoded.set(path, img);
      return img;
    }).catch((error: unknown) => {
      images.delete(path);
      throw error;
    }).finally(() => clearTimeout(timeout));
    images.set(path, result);
    return result;
  }

  const image = (path: string) => decoded.get(path)!;
  function layer(ctx: CanvasRenderingContext2D, { url, rectPx }: ImageLayer) {
    if (rectPx) ctx.drawImage(image(url), ...rectPx);
    else ctx.drawImage(image(url), 0, 0);
  }

  const exteriorKey = ({ designId, appearance }: Building) =>
    JSON.stringify([designId, appearance?.facadeColor ?? null, appearance?.decorations ?? null]);

  async function preloadBuilding(building: Building) {
    const key = exteriorKey(building);
    if (painters.has(key)) return;
    const design = designs.get(building.designId);
    if (!design) throw Error(`Unknown building design ${building.designId}`);
    const parts = design.componentLayers.length ? design.componentLayers : [{ url: design.shell }];
    const mounts = design.decorationMounts.filter((mount) => building.appearance?.decorations ?
      building.appearance.decorations.includes(mount.decoration) : mount.default);
    const expected = new Map<string, PixelPoint | undefined>(mounts.map(({ image }) => [image, undefined]));
    const expectLayer = ({ url, rectPx }: ImageLayer) =>
      expected.set(url, rectPx ? [rectPx[2], rectPx[3]] : design.framePx);
    for (const part of [...parts, ...Object.values(design.endWalls ?? {})]) expectLayer(part);
    if (building.appearance?.facadeColor) expected.set(design.facadeValue, design.framePx);
    for (const w of design.windows) {
      expectLayer(w.unlitInterior);
      expectLayer(w.litInterior);
      if (w.glass) expectLayer(w.glass);
      const walking = w.activityLayers?.walking;
      if (walking) {
        const [, , width, height] = w.maskRectPx ?? w.rectPx;
        expected.set(walking.url, undefined);
        expected.set(w.mask, [width, height]);
      }
    }
    await Promise.all([...expected].map(async ([path, size]) => {
      const img = await decode(path);
      if (size && (img.naturalWidth !== size[0] || img.naturalHeight !== size[1])) {
        images.delete(path);
        decoded.delete(path);
        throw Error(`Unexpected dimensions for ${path}`);
      }
    }));
    if (painters.has(key)) return;
    painters.set(key, preparePainter(design, building, parts, mounts));
  }

  function preparePainter(design: CatalogDesign, building: Building, parts: readonly ImageLayer[],
    mounts: CatalogDesign["decorationMounts"]) {
    const [width, height] = design.framePx;
    const frame = buffer(width, height);
    const exterior = buffer(width, height, Boolean(building.appearance?.facadeColor));
    for (const part of parts) layer(exterior, part);
    if (building.appearance?.facadeColor) {
      tint(exterior, image(design.facadeValue), design.facadeMidtone, building.appearance.facadeColor);
    }
    function decoration(ctx: CanvasRenderingContext2D, mount: typeof mounts[number]) {
      const [x, y, w, h] = mount.rectPx;
      ctx.save();
      if (mount.mirror) {
        ctx.translate(2 * x + w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(image(mount.image), x, y, w, h);
      ctx.restore();
    }
    for (const mount of mounts) {
      if (mount.placement === "wall") decoration(exterior, mount);
    }
    const ground = mounts.filter(({ placement }) => placement === "ground");
    const rooms = new Map(design.rooms.map((room) => {
      const windows = design.windows.filter(({ roomId }) => roomId === room.id);
      return [room.id, {
        left: Math.min(...windows.map(({ rectPx }) => rectPx[0])),
        right: Math.max(...windows.map(({ rectPx: [x, , w] }) => x + w)),
        floor: Math.max(...windows.map(({ rectPx: [, y, , h] }) => y + h)),
        activityHeight: Math.max(...windows.map(({ rectPx }) => rectPx[3])) * .86,
      }] as const;
    }));
    const activityBuffers = new Map(design.windows.flatMap((w) => {
      if (!w.activityLayers?.[WindowActivity.Walking]) return [];
      const [, , mw, mh] = w.maskRectPx ?? w.rectPx;
      return [[w.id, buffer(mw, mh)] as const];
    }));

    function endWall(side: WallSide, top: number) {
      const wall = design.endWalls?.[side];
      if (!wall) return;
      const [x, y, w, h]: PixelRect = wall.rectPx ?? [0, 0, width, height];
      const exposed = Math.min(h, top - y);
      if (exposed <= 0) return;
      frame.save();
      frame.beginPath();
      frame.rect(x, y, w, exposed);
      frame.clip();
      layer(frame, wall);
      frame.restore();
    }

    return (ctx: CanvasRenderingContext2D, instance: Building, seconds: number, neighbors: readonly Building[]) => {
      const { origin, scale } = elevationTransform(design, instance);
      frame.clearRect(0, 0, width, height);
      const xs = instance.footprint.map(({ x }) => x);
      for (const side of [WallSide.Left, WallSide.Right]) {
        const left = side === WallSide.Left;
        const edge = left ? Math.min(...xs) : Math.max(...xs);
        const neighbor = neighbors.find((item) => item !== instance && item.position.depth === instance.position.depth &&
          (left ? Math.max : Math.min)(...item.footprint.map(({ x }) => x)) === edge);
        const otherDesign = neighbor && designs.get(neighbor.designId);
        const cap = otherDesign?.endWalls?.[left ? WallSide.Right : WallSide.Left];
        const otherTop = otherDesign && neighbor && cap?.rectPx ?
          elevationTransform(otherDesign, neighbor).point([0, cap.rectPx[1]]).y : undefined;
        endWall(side, neighbor ? otherTop === undefined ? 0 : (otherTop - origin.y) / scale : height);
      }
      for (const w of design.windows) {
        const phase = roomOffset(`${instance.id}:${w.roomId}`) % 120 / 10;
        const tick = (seconds + phase) % 12;
        const warmth = Math.max(0, Math.min(1, (tick - .8) / 2, (9 - tick) / 2));
        layer(frame, w.unlitInterior);
        frame.globalAlpha = warmth;
        layer(frame, w.litInterior);
        frame.globalAlpha = 1;

        const clip = activityBuffers.get(w.id);
        if (clip) {
          const [x, y, mw, mh] = w.maskRectPx ?? w.rectPx;
          const room = rooms.get(w.roomId)!;
          const art = image(w.activityLayers!.walking!.url);
          const personWidth = room.activityHeight * art.width / art.height;
          const progress = ((seconds + phase) % 6) / 6;
          const personX = room.left - personWidth + (room.right - room.left + personWidth) * progress;
          clip.clearRect(0, 0, mw, mh);
          clip.globalAlpha = .40 + warmth * .32;
          clip.drawImage(art, personX - x, room.floor - room.activityHeight * .68 - y,
            personWidth, room.activityHeight);
          clip.globalAlpha = 1;
          clip.globalCompositeOperation = "destination-in";
          clip.drawImage(image(w.mask), 0, 0, mw, mh);
          clip.globalCompositeOperation = "source-over";
          frame.drawImage(clip.canvas, x, y);
        }
        if (w.glass) layer(frame, w.glass);
      }
      frame.drawImage(exterior.canvas, 0, 0);
      ctx.save();
      ctx.translate(origin.x, origin.y);
      ctx.scale(scale, scale);
      ctx.drawImage(frame.canvas, 0, 0);
      for (const mount of ground) decoration(ctx, mount);
      ctx.restore();
    };
  }

  return {
    async preload(scene: Scene) { await Promise.all(scene.town.buildings.map(preloadBuilding)); },
    draw(ctx: CanvasRenderingContext2D, building: Building, seconds: number, neighbors: readonly Building[]) {
      const paint = painters.get(exteriorKey(building));
      paint?.(ctx, building, seconds, neighbors);
      return Boolean(paint);
    },
  };
}

export type BuildingArt = ReturnType<typeof createBuildingArt>;
