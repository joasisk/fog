import "./style.css";
import { SoundEngine } from "../audio/sound-engine.ts";
import { UseKind } from "../model/places.ts";
import { createRenderer } from "./render.ts";
import { RegenerationScope } from "../model/regeneration.ts";
import type { RegenerationTarget } from "../model/regeneration.ts";
import { createMixer } from "./mixer.ts";
import { pilotAudio } from "./audio-assets.ts";
import { hitTarget, regenerate } from "./regenerate.ts";
import { createPilot, height, marketStreet, shopSite, streetDepth, streetY, width } from "./scene.ts";

const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
const soundButton = document.querySelector<HTMLButtonElement>("#sound")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;
const timings = {
  [RegenerationScope.Building]: { coverMs: 2400, revealMs: 3000 },
  [RegenerationScope.Street]: { coverMs: 3000, revealMs: 3600 },
  [RegenerationScope.Town]: { coverMs: 3500, revealMs: 4100 },
};
const holdMs = 180;
let scene = createPilot();
let listenerX = width / 2;
const listener = () => ({ x: listenerX, y: streetY, depth: streetDepth });
let engine: SoundEngine | undefined;
const mixVolumes = createMixer(document.querySelector<HTMLDetailsElement>("#sound-mixer")!,
  (category, volume) => engine?.setMixVolume(category, volume));
let audioReady: Promise<void> | undefined;
type Replacement = NonNullable<ReturnType<typeof regenerate>>;
let transition: { replacement: Replacement; scope: RegenerationScope; started: number; ready: boolean; revealed?: number } | undefined;

const draw = createRenderer(canvas);
const started = performance.now();
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

function startAudio() {
  if (audioReady) return audioReady;
  try {
    const audio = engine ??= new SoundEngine(new AudioContext(), pilotAudio, width, listener());
    for (const [category, volume] of mixVolumes) audio.setMixVolume(category, volume);
    // Resume synchronously from the gesture while asset decoding runs in parallel.
    const opening = scene;
    audioReady = Promise.all([audio.unlock(), audio.preload(opening.soundscape)])
      .then(() => {
        audio.setSoundscape(scene.soundscape);
        soundButton.hidden = true;
      })
      .catch(() => {
        audioReady = undefined;
        soundButton.hidden = false;
        status.textContent = "Sound could not start. Try Enable sound again.";
      });
  } catch {
    status.textContent = "Sound is unavailable in this browser.";
  }
  return audioReady;
}

function changeScene(target: RegenerationTarget) {
  if (transition) return;
  const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
  const replacement = regenerate(scene, target, seed);
  if (!replacement) return;
  const pending = { scope: target.scope, replacement, started: performance.now(), ready: !engine };
  transition = pending;
  void engine?.preload(replacement.scene.soundscape).finally(() => {
    pending.ready = true;
  });
  engine?.fadeTown(0, timings[target.scope].coverMs);
}

const smooth = (t: number) => {
  const p = Math.max(0, Math.min(1, t));
  return p * p * (3 - 2 * p);
};

function animation(now: number) {
  let cover = 0;
  if (transition) {
    const { coverMs, revealMs } = timings[transition.scope];
    const elapsed = now - transition.started;
    if (transition.revealed !== undefined) {
      const progress = (now - transition.revealed) / revealMs;
      cover = 1 - smooth(progress);
      if (progress >= 1) transition = undefined;
    } else {
      cover = smooth(elapsed / coverMs);
      if (elapsed >= coverMs + holdMs && transition.ready) {
        scene = transition.replacement.scene;
        transition.revealed = now;
        engine?.fadeTown(0, 0);
        engine?.setSoundscape(scene.soundscape);
        engine?.fadeTown(1, revealMs);
        const use = scene.town.buildings.find(({ siteId }) => siteId === shopSite)?.uses[0].kind;
        const name = use === UseKind.Bookshop ? "bookshop" : "café";
        canvas.setAttribute("aria-label", `Rainy town with a ${name}, houses and a park`);
        status.textContent = transition.replacement.label;
      }
    }
  }
  engine?.update();
  draw(scene, reducedMotion.matches ? 0 : (now - started) / 1000, cover, transition?.replacement.bounds,
    transition?.scope === RegenerationScope.Town);
  requestAnimationFrame(animation);
}
requestAnimationFrame(animation);

function toScene(event: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) / rect.width * width, y: (event.clientY - rect.top) / rect.height * height };
}

function moveListener(x: number) {
  listenerX = Math.max(0, Math.min(width, x));
  engine?.setListenerTarget(listener());
}

let gesture: { id: number; x: number; y: number; moved: boolean } | undefined;
canvas.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary || event.button !== 0) return;
  gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  canvas.setPointerCapture(event.pointerId);
  moveListener(toScene(event).x);
});
canvas.addEventListener("pointermove", (event) => {
  if (!event.isPrimary) return;
  const point = toScene(event);
  moveListener(point.x);
  if (gesture?.id === event.pointerId && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 8) {
    gesture.moved = true;
  }
  canvas.style.cursor = hitTarget(scene, point) && !transition ? "pointer" : "default";
});
canvas.addEventListener("pointerup", (event) => {
  if (gesture?.id !== event.pointerId) return;
  const point = toScene(event);
  moveListener(point.x);
  void startAudio();
  if (!gesture.moved && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) <= 8) {
    const target = hitTarget(scene, point);
    if (target) changeScene(target);
  }
  gesture = undefined;
});
canvas.addEventListener("lostpointercapture", (event) => {
  if (gesture?.id === event.pointerId) gesture = undefined;
});
canvas.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (event.repeat) return;
    void startAudio();
    changeScene({ scope: RegenerationScope.Building, siteId: shopSite });
  } else if (event.key.toLowerCase() === "s" || event.key.toLowerCase() === "t") {
    if (event.repeat) return;
    void startAudio();
    changeScene(event.key.toLowerCase() === "s" ? { scope: RegenerationScope.Street, streetId: marketStreet }
      : { scope: RegenerationScope.Town });
  } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    moveListener(listenerX + (event.key === "ArrowLeft" ? -35 : 35));
  }
});
soundButton.addEventListener("click", () => void startAudio());
