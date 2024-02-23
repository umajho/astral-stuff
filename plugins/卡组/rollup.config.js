import packageJSON from "./package.json" assert { type: "json" };

import fs from "node:fs/promises";

import YAML from "yaml";

import json from "@rollup/plugin-json";
import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";

import rollupPluginAstralDice from "rollup-plugin-astral-dice";

import * as coreConfigs from "./core-configs.js";

const auto = await (async () => {
  const configs = await import("./configs.template.js");
  return {
    keywordRegexp: coreConfigs.keywordRegexp.source,
    program: coreConfigs.program,
    ...(packageJSON.version ? { version: packageJSON.version } : {}),
    ...(packageJSON.homepage ? { homepage: packageJSON.homepage } : {}),
    ...configs,
  };
})();

/** @type {import("rollup").RollupOptions} */
const options = {
  input: "./src/mod.ts",
  output: {
    file: "./dist/mod.js",
    format: "iife",
  },
  plugins: [
    json(),
    typescript(),
    nodeResolve(),
    terser(),
    rollupPluginAstralDice(auto),
  ],
};

export default options;
