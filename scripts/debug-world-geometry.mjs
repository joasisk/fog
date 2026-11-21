import { LAYOUT_CASES, generateWorldGeometry, generateWorldLayout, renderGeometryDebug, renderLayoutDebug } from "../src/generation/index.ts";

const [caseName, view] = process.argv.slice(2);
const layoutViews = ["districts", "parcels", "massing"];
const views = ["terrain", "exclusions", "grades", "connectivity", ...layoutViews];
if (!Object.hasOwn(LAYOUT_CASES, caseName) || !views.includes(view)) {
  console.error(`Choose a case (${Object.keys(LAYOUT_CASES).join(", ")}) and a view (${views.join(", ")}).`);
  process.exitCode = 1;
} else {
  const recipe = LAYOUT_CASES[caseName];
  const isLayout = layoutViews.includes(view);
  const snapshot = isLayout ? generateWorldLayout(recipe) : generateWorldGeometry(recipe);
  process.stdout.write(isLayout ? renderLayoutDebug(snapshot, view) : renderGeometryDebug(snapshot, view));
  if (!snapshot.ok) {
    for (const { tier, stage, shortfalls } of snapshot.diagnostics) {
      console.error(`${tier} [${stage}] ${shortfalls.join("; ")}`);
    }
    process.exitCode = 1;
  }
}
