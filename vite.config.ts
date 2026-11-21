import { cp } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: { input: { pilot: resolve("index.html"), hillside: resolve("townscape.html") } },
  },
  plugins: [{
    name: "fog-building-catalog",
    apply: "build",
    async writeBundle({ dir }) {
      const source = resolve("assets/building-catalog");
      await cp(source, resolve(dir ?? "dist", "assets/building-catalog"), {
        recursive: true,
        filter(path) {
          const name = relative(source, path);
          return !/^(review|sets)(\/|$)/.test(name) &&
            !/(^|\/)(preview\.png|source\.ora)$/.test(name) &&
            !/\.(?!png$|json$)[^/]+$/.test(name);
        },
      });
    },
  }, {
    name: "fog-townscape",
    apply: "build",
    async writeBundle({ dir }) {
      for (const batch of ["batch-01", "batch-02"]) {
        const source = resolve("assets/townscape", batch);
        await cp(source, resolve(dir ?? "dist", "assets/townscape", batch), {
          recursive: true,
          filter(path) {
            const name = relative(source, path);
            return !name || name === "manifest.v1.json" || name === "hillside.v1.json" || /^png(\/|$)/.test(name);
          },
        });
      }
    },
  }],
});
