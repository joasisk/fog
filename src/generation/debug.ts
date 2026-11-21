import type { WorldGeometry } from "./index.ts";
import { reachableRoadNodes } from "./roads.ts";
import type { Terrain, WorldPoint } from "./terrain.ts";

export type GeometryDebugView = "terrain" | "exclusions" | "grades" | "connectivity";

export function renderGeometryDebug(world: WorldGeometry, view: GeometryDebugView): string {
  const { domain, step, profiles, samples, exclusions } = world.terrain;
  const width = 720;
  const margin = 24;
  const scale = (width - 2 * margin) / (domain.maxX - domain.minX);
  const planPoint = ({ x, d }: WorldPoint) => [(x - domain.minX) * scale + margin, d * scale + 44];
  const path = (points: readonly (readonly number[])[]) =>
    points.map(([x, y]) => `${x!.toFixed(2)},${y!.toFixed(2)}`).join(" ");
  const polygon = (points: readonly (readonly number[])[], fill: string) =>
    `<polygon points="${path(points)}" fill="${fill}"/>`;
  const line = (points: readonly (readonly number[])[], color: string, stroke = 2) =>
    `<polyline points="${path(points)}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"/>`;
  const text = (x: number, y: number, label: string) =>
    `<text x="${x}" y="${y}" fill="#172626" font-family="sans-serif" font-size="13">${label}</text>`;
  const height = view === "terrain" ? 60 + profiles.length * 98 : Math.ceil(domain.maxDepth * scale) + 84;
  const title = {
    terrain: "Terrain profiles · height and depth in F",
    exclusions: "Buildable ground · water (blue), saturation (teal), cliffs (brown)",
    grades: "Road grades · ≤4° (green), >4–6° (ochre), >6–8° (red)",
    connectivity: "Road connectivity · spine (blue), branch (teal), connector (brown), exit (white)",
  }[view];
  const elements = [`<rect width="${width}" height="${height}" fill="#f7f6ee"/>`, text(margin, 25, title)];
  if (view === "terrain") {
    for (const [index, profile] of profiles.entries()) {
      const bottom = 126 + index * 98;
      const plot = profile.surface.map(({ x, h }) =>
        [(x - domain.minX) * scale + margin, bottom - (h - profile.fillBase) * 11]);
      elements.push(text(margin, bottom - 72, `d = ${profile.d} F`));
      elements.push(polygon([...plot, [width - margin, bottom], [margin, bottom]], "#b4c6a1"));
      elements.push(line(plot, "#354e39"));
    }
  } else {
    const colors: Record<Terrain["exclusions"][number]["kind"], string> = {
      water: "#779ec1", saturated: "#82b4aa", cliff: "#b08a6f",
    };
    for (const sample of samples) {
      const [x, y] = planPoint(sample);
      const color = sample.buildable ? "#d4dfc3" : "#e6e3d6";
      elements.push(`<rect x="${x! - step * scale / 2}" y="${y! - step * scale / 2}" width="${step * scale}" height="${step * scale}" fill="${color}"/>`);
    }
    for (const { kind, polygon: points } of exclusions) {
      elements.push(polygon(points.map(planPoint), colors[kind]));
    }
    if (world.ok && (view === "grades" || view === "connectivity")) {
      const { roads } = world;
      const start = roads.nodes.find(({ approachId }) => approachId !== undefined);
      const reachable = start ? reachableRoadNodes(roads, start.id) : new Set();
      const routeColors = { spine: "#254e8e", branch: "#226d61", connector: "#8a5337",
        bridge: "#605082", stairs: "#81516e" };
      for (const edge of roads.edges) {
        if (view === "connectivity") {
          elements.push(line(edge.centerline.map(planPoint), routeColors[edge.route], 3));
          continue;
        }
        for (const [index, grade] of edge.gradesDegrees.entries()) {
          const steepness = Math.abs(grade);
          const color = steepness <= 4 ? "#237451" : steepness <= 6 ? "#977023" : "#a43e35";
          elements.push(line(edge.centerline.slice(index, index + 2).map(planPoint), color, 3));
        }
      }
      if (view === "connectivity") {
        for (const node of roads.nodes) {
          const [x, y] = planPoint(node.position);
          const fill = !reachable.has(node.id) ? "#c42626" : node.approachId ? "#fff" : "#263937";
          elements.push(`<circle cx="${x}" cy="${y}" r="${node.approachId ? 5 : 3}" fill="${fill}" stroke="#263937"/>`);
        }
        elements.push(text(margin, height - 12, `${reachable.size} / ${roads.nodes.length} nodes reachable from an exit`));
      }
    } else if (!world.ok && (view === "grades" || view === "connectivity")) {
      elements.push(text(margin, height - 12, "No accepted road graph"));
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img"><title>${title}</title>${elements.join("")}</svg>\n`;
}
