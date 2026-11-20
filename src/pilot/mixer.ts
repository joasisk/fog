import type { MixCategory } from "../audio/sound-engine.ts";
import { BuildingType } from "../model/building-designs.ts";

const storageKey = "fog.sound-mix.v1";

function loadVolumes(): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch {
    // The mixer also works in sessions where storage is unavailable.
  }
  return {};
}

export function createMixer(panel: HTMLDialogElement, onVolume: (category: MixCategory, volume: number) => void) {
  const volumes = new Map<MixCategory, number>();
  const saved = loadVolumes();
  const list = panel.querySelector(".mix-levels")!;

  function addControl(category: MixCategory, name: string) {
    const savedVolume = saved[category];
    const volume = typeof savedVolume === "number" && Number.isFinite(savedVolume)
      ? Math.round(Math.max(0, Math.min(1, savedVolume)) * 100) : 100;
    volumes.set(category, volume / 100);
    const label = document.createElement("label");
    const caption = document.createElement("span");
    const input = document.createElement("input");
    const value = document.createElement("output");
    caption.textContent = name;
    input.id = `mix-${category}`;
    input.type = "range";
    input.min = "0";
    input.max = "100";
    input.value = String(volume);
    value.textContent = `${volume}%`;
    value.setAttribute("aria-hidden", "true");
    input.addEventListener("input", () => {
      const level = input.valueAsNumber;
      value.textContent = `${level}%`;
      volumes.set(category, level / 100);
      onVolume(category, level / 100);
    });
    input.addEventListener("change", () => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(volumes)));
      } catch {
        // A storage failure leaves the live mix intact.
      }
    });
    label.append(caption, input, value);
    list.append(label);
  }

  addControl("ambient", "Ambient sound");
  const buildings = Object.values(BuildingType).map((type) => {
    const name = type === BuildingType.Cafe ? "Café" : type[0]!.toUpperCase() + type.slice(1).replaceAll("-", " ");
    return { type, name };
  }).sort((a, b) => a.name.localeCompare(b.name));
  for (const { type, name } of buildings) addControl(type, name);
  window.addEventListener("keydown", (event) => {
    const isS = event.key.toLowerCase() === "s" || event.code === "KeyS";
    if (!isS || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.repeat) return;
    if (panel.open) panel.close();
    else {
      panel.showModal();
      panel.querySelector("input")?.focus();
    }
  }, { capture: true });
  return volumes;
}
