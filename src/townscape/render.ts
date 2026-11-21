import type { PixelPoint, PixelRect } from "../model/assets.ts";
import { requireValue, toPixels } from "./assets.ts";
import type { TownscapeAsset } from "./assets.ts";
import type { Hillside, Sprite } from "./fixture.ts";

export interface View {
  wet: boolean;
  mist: boolean;
  routes: boolean;
  alternate: boolean;
  seconds: number;
}

interface Tile {
  image: CanvasImageSource;
  rect: PixelRect;
}

function context(canvas: HTMLCanvasElement, readPixels = false) {
  const painter = canvas.getContext("2d", { willReadFrequently: readPixels });
  requireValue(painter, "Canvas 2D is unavailable");
  painter.imageSmoothingQuality = "high";
  return painter;
}

function makeSurface(w: number, h: number, readPixels = false) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return { canvas, painter: context(canvas, readPixels) };
}

async function loadImage(url: URL, expected?: PixelPoint) {
  const image = new Image();
  image.src = url.href;
  try {
    await image.decode();
  } catch {
    throw Error(`Could not decode ${url.pathname}`);
  }
  requireValue(!expected || (expected[0] === image.naturalWidth && expected[1] === image.naturalHeight),
    `${url.pathname}: image does not match declared frame`);
  return image;
}

const tracing = (c: CanvasRenderingContext2D, points: readonly PixelPoint[]) => {
  const [first, ...rest] = points;
  c.beginPath();
  c.moveTo(...first!);
  for (const point of rest) c.lineTo(...point);
};

// A seeded tile keeps rain deterministic without adding geometry to the resolved bands.
function paintRain() {
  const { canvas, painter } = makeSurface(512, 512);
  let seed = 532197;
  const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  painter.lineWidth = .7;
  painter.strokeStyle = "#e7e1cf";
  for (let i = 0; i < 260; i++) {
    const x = next() * 512;
    const y = next() * 512;
    const len = next() * 14 + 4;
    painter.globalAlpha = .05 + next() * .16;
    for (const shiftX of [x, x + 512]) {
      for (const shiftY of [y, y - 512]) {
        tracing(painter, [[shiftX, shiftY], [shiftX - len * .25, shiftY + len]]);
        painter.stroke();
      }
    }
  }
  return canvas;
}

export async function prepareRenderer(canvas: HTMLCanvasElement, layout: Hillside, inventory: ReadonlyMap<string, TownscapeAsset>) {
  const views = layout.bands.flatMap((band) => [...Object.values(band.packets).flat(), ...band.mist?.sheets ?? []]);
  const needed = new Map<TownscapeAsset, Set<string>>();
  const add = (art: TownscapeAsset, names: Iterable<string>) => {
    const found = needed.get(art) ?? new Set<string>();
    for (const name of names) if (art.hrefs.has(name)) found.add(name);
    needed.set(art, found);
  };
  for (const sprite of views) {
    for (const art of [sprite.art, ...sprite.alternates ?? []]) {
      if (art.distribution) {
        const { density, falloff, noise } = art.distribution;
        add(art, [density, falloff, noise]);
        continue;
      }
      add(art, [...sprite.layers ?? art.layer_order, "wet",
        ...sprite.exposed?.map((side) => art.wall_contacts?.[side]?.exposed_end_layer ?? "") ?? []]);
      for (const room of art.rooms ?? []) add(art, [room.unlit_overlay, ...room.motion?.frames ?? []]);
      for (const mount of art.mounts ?? []) {
        const component = inventory.get(mount.asset)!;
        add(component, [...component.layer_order, "light"]);
      }
    }
  }
  const images = new Map<URL, HTMLImageElement>();
  const loadLayers = Promise.all([...needed].flatMap(([art, labels]) => [...labels].map(async (name) => {
      const url = art.hrefs.get(name)!;
      images.set(url, await loadImage(url, art.source_dimensions_px));
  })));
  const [w, h] = layout.size;
  const loadScenery = async (url: URL, top: number, bottom: number) => {
    const original = await loadImage(url, layout.size);
    const image = await createImageBitmap(original, 0, top, w, bottom - top);
    return { image, top };
  };
  const skyBottom = Math.ceil(layout.bands[0]!.terrainRange[1]) + 4;
  const [sky, land] = await Promise.all([
    loadScenery(layout.sky, 0, skyBottom),
    Promise.all(layout.bands.map((band, i) => {
      const next = layout.bands[i+1];
      const top = Math.max(0, Math.floor(band.terrainRange[0]) - 3);
      const bottom = next ? Math.ceil(next.terrainRange[1]) + 4 : h;
      return loadScenery(band.art, top, bottom);
    })),
    loadLayers,
  ]);

  const layer = (art: TownscapeAsset, name: string) => images.get(art.hrefs.get(name)!);
  const packed = new Map<string, Tile>();
  const makeTile = (art: TownscapeAsset, readPixels = false) => {
    const [x, y, w, h] = art.trim_rect_px;
    const surface = makeSurface(w, h, readPixels);
    surface.painter.translate(-x, -y);
    return surface;
  };

  function mistTile(art: TownscapeAsset) {
    const key = art.asset_id;
    let tile = packed.get(key);
    if (tile) return tile;
    const [x, y, w, h] = art.trim_rect_px;
    const { painter, canvas } = makeTile(art, true);
    const { density, falloff, noise } = art.distribution!;
    const sample = (name: string) => {
      painter.drawImage(layer(art, name)!, 0, 0);
      const samplePixels = painter.getImageData(0, 0, w, h).data;
      painter.clearRect(x, y, w, h);
      return samplePixels;
    };
    const base = sample(density);
    const terrain = sample(falloff);
    const variation = sample(noise);
    const data = painter.createImageData(w, h);
    for (let i = 0; i < data.data.length; i += 4) {
      const tau = base[i]! / 255 * terrain[i]! / 255 * (.36 + .27 * variation[i]! / 255);
      data.data[i] = 236;
      data.data[i + 1] = 232;
      data.data[i + 2] = 215;
      data.data[i + 3] = Math.round(255 * (1 - Math.exp(-tau)));
    }
    painter.putImageData(data, 0, 0);
    tile = { image: canvas, rect: art.trim_rect_px };
    packed.set(key, tile);
    return tile;
  }

  function compose(art: TownscapeAsset, names: readonly string[], wet: boolean, lit: boolean,
    ends: readonly string[], movingFrame?: string): Tile {
    const weathered = wet && art.hrefs.has("wet");
    const key = [art.asset_id, names.join(","), weathered, lit, ends.join(","), movingFrame ?? ""].join("/");
    const cached = packed.get(key);
    if (cached) return cached;
    const { painter, canvas } = makeTile(art);
    const group = art.rooms?.[0];
    const draw = (name: string) => {
      const png = layer(art, name);
      if (png) painter.drawImage(png, 0, 0);
    };
    for (const end of ends) draw(end);
    for (const name of names) {
      if (group && !lit && name === group.unlit_before) draw(group.unlit_overlay);
      if (lit && art.overlay_before?.light === name) draw("light");
      if (group?.motion?.frames[0] !== name) draw(name);
      else if (movingFrame) draw(movingFrame);
    }
    for (const mount of art.mounts ?? []) {
      const socket = art.sockets![mount.socket]!;
      const part = inventory.get(mount.asset)!;
      const mounted = compose(part, part.layer_order, false, lit && mount.light_group === "ground", []);
      const [x, y] = toPixels(art.source_dimensions_px, socket.uv);
      const [cx, cy, cw, ch] = mounted.rect;
      painter.drawImage(mounted.image, x + (cx - part.pivotPx[0]) * mount.scale,
        y + (cy - part.pivotPx[1]) * mount.scale, cw * mount.scale, ch * mount.scale);
    }
    if (weathered) draw("wet");
    const tile = { image: canvas, rect: art.trim_rect_px };
    packed.set(key, tile);
    return tile;
  }

  // Decode and compose before the first interactive frame. Both shop states can be used immediately.
  for (const sprite of views) {
    for (const art of [sprite.art, ...sprite.alternates ?? []]) {
      if (art.distribution) {
        mistTile(art);
        continue;
      }
      const names = sprite.layers ?? art.layer_order;
      const ends = sprite.exposed?.flatMap((side) => art.wall_contacts?.[side]?.exposed_end_layer ?? []) ?? [];
      compose(art, names, false, false, ends);
      if (sprite.lights) {
        const motion = art.rooms?.[0]?.motion;
        for (const frame of motion?.frames ?? [undefined]) {
          compose(art, names, true, true, ends, frame);
        }
      } else {
        compose(art, names, true, false, ends);
      }
    }
  }

  const { canvas: scene, painter: c } = makeSurface(...layout.size);
  const display = context(canvas);
  const rain = paintRain();
  const pattern = c.createPattern(rain, "repeat")!;
  const drawLane = (painter: CanvasRenderingContext2D, points: readonly PixelPoint[], q: number, wet: boolean) => {
    painter.lineCap = "round";
    painter.lineJoin = "round";
    tracing(painter, points);
    painter.lineWidth = 9.4 * q;
    painter.strokeStyle = "#736959";
    painter.stroke();
    painter.lineWidth = 7.8 * q;
    painter.strokeStyle = wet ? "#a89e8b" : "#b5a283";
    painter.stroke();
    painter.lineWidth = .87 * q;
    painter.strokeStyle = wet ? "#c8c2ad" : "#c6b398";
    painter.stroke();
  };

  function stamp(painter: CanvasRenderingContext2D, sprite: Sprite, wet: boolean, seconds = 0, alternate = false, offset = 0) {
    const art = alternate ? sprite.alternates![0]! : sprite.art;
    const lit = wet && sprite.lights === true;
    const motion = lit ? art.rooms?.[0]?.motion : undefined;
    const frame = motion?.frames[Math.floor(seconds * 1000 / motion.frame_duration_ms) % motion.frames.length];
    const ends = sprite.exposed?.flatMap((side) => art.wall_contacts?.[side]?.exposed_end_layer ?? []) ?? [];
    const tile = art.distribution ? mistTile(art) : compose(art, sprite.layers ?? art.layer_order, wet, lit, ends, frame);
    const [x, y, width, height] = tile.rect;
    painter.save();
    painter.globalAlpha = sprite.opacity;
    painter.translate(sprite.anchor[0] + offset, sprite.anchor[1]);
    painter.scale(sprite.mirror ? -sprite.scale : sprite.scale, sprite.scale);
    painter.drawImage(tile.image, x - art.pivotPx[0], y - art.pivotPx[1]);
    painter.restore();
    return width * height * sprite.scale ** 2;
  }

  // Cache the ordered, static prefix of each band. Draw the shop and any later
  // packets in its band live so animation cannot move them behind the shop.
  const strips = layout.bands.map((band, index) => {
    const backdrop = land[index]!;
    const sprites = Object.values(band.packets).flat();
    const boundary = sprites.indexOf(layout.slot);
    const staticSprites = boundary === -1 ? sprites : sprites.slice(0, boundary);
    const live = boundary === -1 ? [] : sprites.slice(boundary);
    const top = Math.max(0, Math.floor(Math.min(backdrop.top, ...staticSprites.map((sprite) =>
      sprite.anchor[1] + (sprite.art.trim_rect_px[1] - sprite.art.pivotPx[1]) * sprite.scale))) - 2);
    const surface = makeSurface(w, backdrop.top + backdrop.image.height - top);
    return { ...surface, top, band, backdrop, live };
  });
  let cachedWet: boolean | undefined;
  function paintStrips(wet: boolean) {
    for (const strip of strips) {
      const { painter, canvas, top, band, backdrop } = strip;
      painter.clearRect(0, 0, w, canvas.height);
      painter.save();
      painter.translate(0, -top);
      painter.drawImage(backdrop.image, 0, backdrop.top);
      for (const [pass, sprites] of Object.entries(band.packets)) {
        if (pass === "roads") {
          for (const road of band.roads) if (road.kind === "lane") drawLane(painter, road.path, band.q, wet);
        }
        for (const sprite of sprites) {
          if (sprite === layout.slot) break;
          stamp(painter, sprite, wet);
        }
        if (sprites.includes(layout.slot)) break;
      }
      painter.restore();
    }
    cachedWet = wet;
  }
  // All colour states and motion frames are now retained as cropped tiles.
  images.clear();

  function draw(view: View) {
    if (view.wet !== cachedWet) paintStrips(view.wet);
    let samples = sky.image.width * sky.image.height;
    let calls = 1;
    c.clearRect(0, 0, w, h);
    c.drawImage(sky.image, 0, 0);
    for (const { band, canvas, top, live } of strips) {
      c.drawImage(canvas, 0, top);
      samples += canvas.width * canvas.height;
      calls++;
      for (const sprite of live) {
        samples += stamp(c, sprite, view.wet, view.seconds, view.alternate && sprite === layout.slot);
        calls++;
      }
      if (view.mist && band.mist) {
        const { seconds, drift, sheets } = band.mist;
        const phase = view.seconds / seconds * 2 * Math.PI;
        for (let index = 0; index < sheets.length; index++) {
          samples += stamp(c, sheets[index]!, view.wet, 0, false, drift * Math.sin(phase + index * .23));
          calls++;
        }
      }
    }
    if (view.wet) {
      c.save();
      c.fillStyle = pattern;
      const shiftX = -view.seconds * 43 % 512;
      const shiftY = view.seconds * 172 % 512;
      c.translate(shiftX, shiftY);
      c.fillRect(-shiftX, -shiftY, w, h);
      c.restore();
      samples += w * h;
    }
    if (view.routes) {
      c.save();
      c.strokeStyle = "rgba(247, 222, 148, .88)";
      c.lineCap = "round";
      c.lineWidth = 2;
      for (const road of layout.roads) {
        tracing(c, road.path);
        c.stroke();
      }
      c.strokeStyle = "#3b6056";
      for (const access of layout.entrances) {
        const q = access.width > 12 ? 2.3 : 1.8;
        const end = access.path[1];
        tracing(c, access.path);
        c.stroke();
        c.beginPath();
        c.arc(end[0], end[1], q, 0, 2 * Math.PI);
        c.stroke();
      }
      c.restore();
    }
    // Keep all contacts in the same 1920×1080 render before the final resample.
    display.imageSmoothingQuality = "high";
    display.drawImage(scene, 0, 0, canvas.width, canvas.height);
    return { spriteDraws: calls, sampledPixels: Math.round(samples) };
  }

  const bytes = () => {
    const rasters = [sky, ...land].reduce((total, { image }) => total + image.width * image.height * 4, 0);
    const staticStrips = strips.reduce((total, { canvas }) => total + canvas.width * canvas.height * 4, 0);
    const tiles = [...packed.values()].reduce((total, tile) => total + tile.rect[2] * tile.rect[3] * 4, 0);
    return rasters + staticStrips + tiles + 4 * (rain.width * rain.height + w * h + canvas.width * canvas.height);
  };

  return { draw, bytes };
}
