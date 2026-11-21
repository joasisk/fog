import { SoundEngine } from "../audio/sound-engine.ts";
import type { PixelPoint } from "../model/assets.ts";
import type { StreetSegmentId } from "../model/network.ts";
import { loadPacks } from "../townscape/assets.ts";
import { replaceFoothill, resolveFoothill } from "../townscape/foothill.ts";
import { prepareRenderer } from "../townscape/render.ts";
import type { View } from "../townscape/render.ts";
import { pilotAudio } from "./audio-assets.ts";
import { createMixer } from "./mixer.ts";

type Scope = "building" | "town" | StreetSegmentId;
type Renderer = Awaited<ReturnType<typeof prepareRenderer>>;
const reviewSeeds = ["7419", "7430", "7431"];
const duration = { cover: 1600, reveal: 2200 };

export async function startFoothill(seed: string) {
  const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
  const controls = document.querySelector<HTMLFieldSetElement>("#foothill-controls")!;
  const sound = document.querySelector<HTMLButtonElement>("#sound")!;
  const status = document.querySelector<HTMLParagraphElement>("#status")!;
  const size = document.querySelector<HTMLSelectElement>("#foothill-size")!;
  const overlay = document.querySelector<HTMLSelectElement>("#foothill-overlay")!;
  const mist = document.querySelector<HTMLInputElement>("#foothill-mist")!;
  const shop = document.querySelector<HTMLButtonElement>("#foothill-shop")!;
  const street = document.querySelector<HTMLButtonElement>("#foothill-street")!;
  const town = document.querySelector<HTMLButtonElement>("#foothill-town")!;
  const heading = document.querySelector<HTMLSpanElement>("h1 span")!;
  const instructions = document.querySelector<HTMLParagraphElement>("#instructions")!;
  heading.textContent = "Foothill town";
  document.title = "Fog · Foothill town";
  instructions.textContent = "Move to listen. Select the shop, a lane, or open sky to replace it.";
  controls.hidden = false;
  controls.disabled = true;
  sound.disabled = true;
  status.textContent = "Preparing foothill town…";
  const root = new URL("assets/townscape/", new URL(import.meta.env.BASE_URL, document.baseURI));
  const manifest = new URL("batch-02/manifest.v1.json", root);
  const source = new URL("batch-02/hillside.v1.json", root);
  const inventory = await loadPacks(manifest, root);
  let scene = resolveFoothill(seed, inventory, source);
  let renderer = await prepareRenderer(canvas, scene.hillside, inventory);
  let engine: SoundEngine | undefined;
  let audioPending = false;
  let busy = false;
  let cover = 0;
  const listener = { x: 960, y: 850, depth: .1 };
  const volumes = createMixer(document.querySelector<HTMLDialogElement>("#sound-mixer")!,
    (category, volume) => engine?.setMixVolume(category, volume));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const begun = performance.now();
  let frame = 0;

  function showScene() {
    const bookshop = scene.slot.use === "bookshop";
    shop.textContent = bookshop ? "Place café" : "Place bookshop";
    canvas.dataset.seed = scene.world.recipe.seed;
    canvas.dataset.shop = scene.slot.use;
    canvas.dataset.shopJoins = String(scene.slot.sharedWalls.length);
    canvas.dataset.streetVersion = String(scene.options.streets?.get(scene.slot.edgeId) ?? 0);
    canvas.setAttribute("aria-label", `Rainy foothill town, seed ${scene.world.recipe.seed}, with a ${bookshop ? "bookshop" : "café"}`);
  }

  function configureSize() {
    const [width, height] = size.value === "960" ? scene.hillside.reducedSize : scene.hillside.size;
    canvas.width = width;
    canvas.height = height;
  }

  function draw(now: number) {
    const before = performance.now();
    const stats = renderer.draw({
      wet: true, mist: mist.checked, alternate: false, routes: false, cover,
      seconds: reduce.matches ? 0 : (now - begun) / 1000,
      overlay: overlay.value as NonNullable<View["overlay"]>,
    });
    canvas.dataset.drawMs = (performance.now() - before).toFixed(2);
    canvas.dataset.rasterBytes = String(renderer.bytes());
    canvas.dataset.spriteDraws = String(stats.spriteDraws);
    canvas.dataset.cover = String(cover);
  }

  function animate(now: number) {
    if (now - frame >= 1000 / 30) {
      frame = now;
      draw(now);
    }
    engine?.update();
    requestAnimationFrame(animate);
  }

  async function unlock() {
    if (audioPending || sound.hidden) return;
    audioPending = true;
    try {
      const audio = engine ??= new SoundEngine(new AudioContext(), pilotAudio, 1920, listener);
      for (const [category, volume] of volumes) audio.setMixVolume(category, volume);
      await Promise.all([audio.unlock(), audio.preload(scene.soundscape)]);
      audio.setSoundscape(scene.soundscape);
      sound.hidden = true;
    } catch (error) {
      console.error(error);
      status.textContent = "Sound could not start. Try Enable sound again.";
    } finally {
      audioPending = false;
    }
  }

  function fade(from: number, to: number, milliseconds: number) {
    return new Promise<void>(resolve => {
      const start = performance.now();
      function frame(now: number) {
        const t = Math.min(1, (now - start) / milliseconds);
        cover = from + (to - from) * t * t * (3 - 2 * t);
        if (t === 1) {
          draw(now);
          resolve();
        } else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }

  async function replace(target: Scope) {
    if (busy) return;
    busy = true;
    shop.disabled = street.disabled = town.disabled = true;
    let prepared: Renderer | undefined;
    try {
      const next = reviewSeeds[(reviewSeeds.indexOf(scene.world.recipe.seed) + 1) % reviewSeeds.length]!;
      const candidate = replaceFoothill(scene, target, next, inventory, source);
      status.textContent = "Preparing replacement…";
      prepared = await prepareRenderer(canvas, candidate.hillside, inventory);
      await engine?.preload(candidate.soundscape);
      const timing = reduce.matches ? { cover: 120, reveal: 120 } : duration;
      engine?.fadeTown(0, timing.cover);
      await fade(0, 1, timing.cover);
      renderer.dispose();
      renderer = prepared;
      prepared = undefined;
      scene = candidate;
      if (target === "town") {
        const url = new URL(location.href);
        url.searchParams.set("seed", scene.world.recipe.seed);
        history.replaceState(null, "", url);
      }
      showScene();
      engine?.setSoundscape(scene.soundscape);
      engine?.fadeTown(1, timing.reveal);
      await fade(1, 0, timing.reveal);
      status.textContent = target === "town" ? `Foothill town ${scene.world.recipe.seed}.` :
        target === "building" ? `The ${scene.slot.use === "cafe" ? "café" : "bookshop"} is open.` : "The street has changed.";
    } catch (error) {
      prepared?.dispose();
      if (cover > 0) {
        cover = 0;
        engine?.fadeTown(1, 120);
      }
      console.error(error);
      status.textContent = "The replacement could not be prepared. The current town is still available.";
    } finally {
      busy = false;
      shop.disabled = street.disabled = town.disabled = false;
    }
  }

  const canvasPoint = (event: PointerEvent): PixelPoint => {
    const rect = canvas.getBoundingClientRect();
    return [(event.clientX - rect.left) / rect.width * 1920, (event.clientY - rect.top) / rect.height * 1080];
  };
  function target(point: PixelPoint): Scope | undefined {
    const exposed = renderer.pick(point);
    if (!exposed) return "town";
    if (exposed.buildingId === scene.slot.id) return "building";
    return exposed.roadId as StreetSegmentId | undefined;
  }

  let gesture: { id: number; x: number; y: number } | undefined;
  canvas.addEventListener("pointerdown", event => {
    if (!event.isPrimary || event.button !== 0) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", event => {
    if (!event.isPrimary) return;
    const point = canvasPoint(event);
    listener.x = point[0];
    engine?.setListenerTarget(listener);
    canvas.style.cursor = !busy && target(point) ? "pointer" : "default";
  });
  canvas.addEventListener("pointerup", event => {
    if (gesture?.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) <= 8) {
      const action = target(canvasPoint(event));
      if (action) void replace(action);
    }
    gesture = undefined;
  });
  canvas.addEventListener("lostpointercapture", () => { gesture = undefined; });
  canvas.addEventListener("keydown", event => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === "enter" || key === " " || key === "s" || key === "t") {
      event.preventDefault();
      void replace(key === "s" ? scene.slot.edgeId : key === "t" ? "town" : "building");
    } else if (key === "arrowleft" || key === "arrowright") {
      event.preventDefault();
      listener.x = Math.max(0, Math.min(1920, listener.x + (key === "arrowleft" ? -70 : 70)));
      engine?.setListenerTarget(listener);
    }
  });
  sound.addEventListener("click", () => void unlock());
  shop.addEventListener("click", () => void replace("building"));
  street.addEventListener("click", () => void replace(scene.slot.edgeId));
  town.addEventListener("click", () => void replace("town"));
  size.value = innerWidth < 1200 ? "960" : "1920";
  size.addEventListener("change", configureSize);
  configureSize();
  showScene();
  controls.disabled = false;
  sound.disabled = false;
  status.textContent = "";
  requestAnimationFrame(animate);
}
