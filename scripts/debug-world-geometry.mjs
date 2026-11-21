import { GEOMETRY_CASES, generateWorldGeometry, renderGeometryDebug } from "../src/generation/index.ts";

const [caseName, view] = process.argv.slice(2);
const views = ["terrain", "exclusions", "grades", "connectivity"];
if (!Object.hasOwn(GEOMETRY_CASES, caseName) || !views.includes(view)) {
  console.error(`Choose a case (${Object.keys(GEOMETRY_CASES).join(", ")}) and a view (${views.join(", ")}).`);
  process.exitCode = 1;
} else {
  const snapshot = generateWorldGeometry(GEOMETRY_CASES[caseName]);
  process.stdout.write(renderGeometryDebug(snapshot, view));
  if (!snapshot.ok) {
    for (const { tier, stage, shortfalls } of snapshot.diagnostics) {
      console.error(`${tier} [${stage}] ${shortfalls.join("; ")}`);
    }
    process.exitCode = 1;
  }
}
