import "./style.css";

const search = new URLSearchParams(location.search);
if (search.get("mode") === "foothill") {
  void import("./foothill.ts").then(({ startFoothill }) => startFoothill(search.get("seed") || "7419"))
    .catch((error: unknown) => {
      console.error(error);
      document.querySelector("#status")!.textContent = error instanceof Error ? error.message : "Could not open the foothill town.";
    });
} else {
  void import("./market-lane.ts");
}
