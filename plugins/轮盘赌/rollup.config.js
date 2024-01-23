import fs from "node:fs/promises";

import YAML from "yaml";

import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";

import rollupPluginAstralDice from "rollup-plugin-astral-dice";

const auto = await (async () => {
  const file = await fs.readFile("auto.yaml");
  return YAML.parse(file.toString());
})();

/** @type {import("rollup").RollupOptions} */
const options = {
  input: "./build/mod.js",
  output: {
    file: "./dist/mod.js",
    format: "iife",
  },
  plugins: [
    typescript(),
    nodeResolve(),
    terser(),
    rollupPluginAstralDice(auto),
  ],
};

export default options;
