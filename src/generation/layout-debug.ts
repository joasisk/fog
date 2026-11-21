import type { District } from "./districts.ts";
import type { WorldLayout } from "./index.ts";
import type { LotUse } from "./layout.ts";
import { benchDepthAt, heightAt } from "./terrain.ts";
import type { WorldPoint } from "./terrain.ts";
import { stationAtDistance, surveyCenterline } from "./walking.ts";

export type LayoutView = "districts" | "parcels" | "massing";
const districtColors: Record<District, string> = {
  historic: "#914938", civic: "#805382", terraced: "#b27a41", "modern-infill": "#51758b", garden: "#679068", rural: "#858456",
};
const openColors: Partial<Record<LotUse, string>> = {
  plaza: "#c29780", park: "#75a176", playground: "#d3ac69", bus_stop: "#9a85b0",
  farmyard: "#c4a47b", garden: "#bfcea9", orchard: "#a9bf8b", field: "#d4cd98",
};

const number = (v: number) => v.toFixed(2);
const points = (pairs: number[][]) => pairs.map((p) => p.map(number).join(",")).join(" ");
const text = (x: number, y: number, label: string, size = 13) =>
  `<text x="${number(x)}" y="${number(y)}" font-family="sans-serif" font-size="${size}" fill="#27372f">${label}</text>`;

export function renderLayoutDebug(world: WorldLayout, view: LayoutView): string {
  const { terrain } = world, { minX, maxX, maxDepth } = terrain.domain;
  const width = 900, margin = 32, scale = (width - 2 * margin) / (maxX - minX);
  const screenX = (x: number) => margin + (x - minX) * scale;
  const plan = (p: WorldPoint) => [screenX(p.x), 54 + p.d * scale];
  const elements: string[] = [];
  let height = 105 + maxDepth * scale;
  const title = { districts: "Districts on the walking graph", parcels: "Parcels, fixture footprints and entrances",
    massing: "Fixture massing across depth bands" }[view];
  elements.push(text(margin, 24, title, 17));
  if (!world.ok) {
    height = 80;
    elements.push(text(margin, 54, "No accepted layout"));
  } else {
    const { layout } = world;
    const byDistrict = new Map(layout.districts.map((s) => [s.id, s.district]));
    const byLot = new Map(layout.lots.map((lot) => [lot.id, lot]));
    if (view === "massing") {
      const bands = [...new Set(layout.lots.map((l) => l.band))].sort((a, b) => b - a);
      height = 66 + bands.length * 118;
      for (const [i, band] of bands.entries()) {
        const bench = terrain.benches[band]!;
        const baseline = 144 + i * 118;
        const ground = terrain.samples.filter((p) => p.d === 0).map(({ x }) => ({
          x, h: heightAt(terrain, { x, d: benchDepthAt(bench, x) })!,
        }));
        const datum = Math.min(...ground.map((p) => p.h));
        const y = (h: number) => baseline - (h - datum) * scale;
        elements.push(text(margin, baseline - 91, `Band ${band + 1} · ${number(bench.depth)} F depth`));
        const line = ground.map((p) => [screenX(p.x), y(p.h)]);
        elements.push(`<polygon points="${points([...line, [screenX(maxX), baseline + 8], [screenX(minX), baseline + 8]])}" fill="#c4d0ab"/>`);
        const masses = layout.buildings.filter((b) => byLot.get(b.lotId)!.band === band).sort((a, b) => b.root.d - a.root.d);
        for (const b of masses) {
          const lot = byLot.get(b.lotId)!, xs = b.footprint.map((p) => screenX(p.x));
          const left = Math.min(...xs), right = Math.max(...xs), floor = y(b.root.h), roof = y(b.root.h + b.height);
          const fill = districtColors[byDistrict.get(lot.districtSectionId)!];
          elements.push(`<polygon points="${points([[left, floor], [left, roof + 6], [(right + left) / 2, roof],
            [right, roof + 6], [right, floor]])}" stroke="#3c493c" stroke-width="0.7" fill="${fill}"/>`);
          for (const pad of b.foundation.supports) {
            const xs = pad.footprint.map((p) => screenX(p.x));
            elements.push(`<rect x="${number(Math.min(...xs))}" y="${number(floor)}" width="${number(Math.max(...xs) - Math.min(...xs))}" height="${number((b.root.h - pad.baseHeight) * scale)}" fill="#928877"/>`);
          }
        }
      }
      elements.push(text(margin, height - 8, "Common world scale in F · rear bands above, front band below"));
    } else {
      if (view === "districts") {
        let x = margin;
        for (const [name, color] of Object.entries(districtColors)) {
          elements.push(`<rect x="${x}" y="35" width="10" height="10" fill="${color}"/>`, text(x + 14, 44, name));
          x += 30 + 7 * name.length;
        }
      } else elements.push(text(margin, 44, "Pale outlines show parcels. Dark outlines show footprints. Lines connect entrances to roads."));
      for (const edge of world.roads.edges) {
        elements.push(`<polyline points="${points(edge.centerline.map(plan))}" fill="none" stroke="#817b6c" stroke-width="${number(edge.width * scale)}"/>`);
        if (view === "districts") {
          const { stations } = surveyCenterline(terrain, edge.centerline);
          for (const s of layout.districts.filter((s) => s.edgeId === edge.id)) {
            const line = [stationAtDistance(stations, s.start), ...stations.filter((p) => p.distance > s.start && p.distance < s.end),
              stationAtDistance(stations, s.end)];
            elements.push(`<polyline points="${points(line.map(plan))}" fill="none" stroke="${districtColors[s.district]}" stroke-width="7"><title>${s.district}</title></polyline>`);
          }
        }
      }
      if (view === "parcels") {
        for (const lot of layout.lots) {
          elements.push(`<polygon points="${points(lot.outline.map(plan))}" fill="${openColors[lot.use] ?? "#d1cab5"}" stroke="#9d9a89" stroke-width="0.7"><title>${lot.use}</title></polygon>`);
        }
        for (const b of layout.buildings) {
          const district = byDistrict.get(byLot.get(b.lotId)!.districtSectionId)!;
          elements.push(`<polygon points="${points(b.footprint.map(plan))}" fill="${districtColors[district]}" stroke="#39453a" stroke-width="0.8"><title>${b.use}</title></polygon>`);
        }
        for (const { entrance } of layout.lots) {
          elements.push(`<polyline points="${points([entrance.threshold, entrance.roadPoint].map(plan))}" stroke="#36433b" stroke-width="1"/>`);
        }
      }
      for (const site of layout.sites.filter((s) => s.id === layout.center.siteId || layout.secondaryCenters.includes(s.id))) {
        const [x, y] = plan(site.entrance.roadPoint);
        elements.push(`<circle cx="${number(x!)}" cy="${number(y!)}" r="5" fill="#fff" stroke="#333"><title>Center</title></circle>`);
      }
      elements.push(text(margin, height - 12, `${world.tier} · ${layout.lots.length} lots · ${layout.buildings.length} buildings · white circles mark centers`));
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${Math.ceil(height)}" role="img"><title>${title}</title><rect width="100%" height="100%" fill="#f7f6ee"/>${elements.join("")}</svg>\n`;
}
