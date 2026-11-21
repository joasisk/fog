import "./style.css";
import { loadPacks, readJson } from "./assets.ts";
import type { RawFixture } from "./fixture.ts";
import { resolveHillside } from "./fixture.ts";
import { prepareRenderer } from "./render.ts";
import type { View } from "./render.ts";

const canvas = document.querySelector<HTMLCanvasElement>("#hillside")!;
const controls = document.querySelector<HTMLFieldSetElement>("#controls")!;
const status = document.querySelector<HTMLParagraphElement>("#load-status")!;
const wet = document.querySelector<HTMLInputElement>("#wet")!;
const mist = document.querySelector<HTMLInputElement>("#mist")!;
const routes = document.querySelector<HTMLInputElement>("#routes")!;
const play = document.querySelector<HTMLInputElement>("#motion")!;
const size = document.querySelector<HTMLSelectElement>("#size")!;
const swap = document.querySelector<HTMLButtonElement>("#swap")!;
const reduces = matchMedia("(prefers-reduced-motion: reduce)");
play.checked = !reduces.matches;

async function start() {
  const base = new URL(import.meta.env.BASE_URL, document.baseURI);
  const root = new URL("assets/townscape/", base);
  const manifest = new URL("batch-02/manifest.v1.json", root);
  const fixtureUrl = new URL("batch-02/hillside.v1.json", root);
  const [art, fixture] = await Promise.all([loadPacks(manifest, root), readJson<RawFixture>(fixtureUrl)]);
  const scene = resolveHillside(fixture, art, fixtureUrl);
  const renderer = await prepareRenderer(canvas, scene, art);
  let current = 0;
  let animation: number | undefined;
  let last: number | undefined;
  let alternate = false;

  const view = (): View => ({ wet: wet.checked, mist: mist.checked, routes: routes.checked, alternate, seconds: current });
  function draw() {
    const before = performance.now();
    const stats = renderer.draw(view());
    canvas.dataset.drawMs = (performance.now() - before).toFixed(2);
    canvas.dataset.rasterBytes = String(renderer.bytes());
    canvas.dataset.sampledPixels = String(stats.sampledPixels);
    canvas.dataset.spriteDraws = String(stats.spriteDraws);
  }
  function animate(now: number) {
    if (last === undefined || now - last >= 1000 / 30) {
      if (last !== undefined) current += Math.min(now - last, 100) / 1000;
      last = now;
      draw();
    }
    animation = requestAnimationFrame(animate);
  }
  function update() {
    const [w, h] = size.value === "960" ? scene.reducedSize : scene.size;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    if (animation !== undefined) cancelAnimationFrame(animation);
    animation = undefined;
    last = undefined;
    draw();
    if (play.checked && (wet.checked || mist.checked)) animation = requestAnimationFrame(animate);
  }

  controls.addEventListener("change", update);
  swap.addEventListener("click", () => {
    alternate = !alternate;
    swap.textContent = alternate ? "Place café" : "Place bookshop";
    canvas.dataset.shop = alternate ? "bookshop" : "cafe";
    update();
  });
  reduces.addEventListener("change", (event) => {
    play.checked = !event.matches;
    update();
  });
  controls.disabled = false;
  canvas.dataset.shop = "cafe";
  update();
  status.hidden = true;
}

void start().catch((error: unknown) => {
  status.textContent = error instanceof Error ? error.message : "The hillside preview could not load.";
  console.error(error);
});
