import { defineConfig } from "tsup";
import dotenv from "dotenv";

export default defineConfig({
  entry: ["src/index.ts"],
  env: dotenv.config().parsed,
  clean: true,
  dts: true,
  sourcemap: true,
  format: ["cjs", "esm"],
  external: ["ora"],
});
