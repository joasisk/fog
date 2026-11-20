import { cp } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
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
  }],
});
