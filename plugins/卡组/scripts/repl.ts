import packageJSON from "../package.json" assert { type: "json" };

import { createInterface } from "node:readline";

import { MockRuntime, Place } from "astral-dice-lib-mock";

import { main as astralMain, MainPrefix } from "../src/astral-main.ts";

import { UserID } from "../src/ids.ts";
import { MainExecutor } from "../src/main-executor.ts";
// @ts-ignore
import { keywordRegexp } from "../core-configs.js";
import { DEFAULT_ROOT_PREFIX, PLUGIN_NAME } from "../src/consts.ts";

const readline = createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  const place: Place = ["group", "42"];
  const senderID = new UserID("0");
  const AUTO = {
    "main-admins": JSON.stringify([senderID.toString()]),
    "usage-url": "https://example.com",
    "scopes": JSON.stringify({ "demo": ["42"] }),
  };

  const rtm = new MockRuntime(AUTO, place);

  let continuousBlankCount = 0;
  let inputs: string[] = [];
  while (true) {
    const input: string = await new Promise((r) => readline.question("> ", r));
    continuousBlankCount = input ? 0 : continuousBlankCount + 1;
    if (continuousBlankCount === /*2*/ 1) {
      // inputs.pop(); // 移除倒数第二行空行。
      evaluate(rtm, senderID, inputs.join("\n"));
      continuousBlankCount = 0;
      inputs = [];
    } else {
      inputs.push(input);
    }
  }
}

function evaluate(rtm: MockRuntime, senderID: UserID, input: string) {
  const g = (keywordRegexp as RegExp).exec(input);
  if (!g) {
    console.log("?");
    return;
  }

  const mainPrefix = g[1], restText = g[2];

  const rootPrefix = DEFAULT_ROOT_PREFIX;

  rtm.useLib((lib) => {
    astralMain(lib, {
      pluginName: PLUGIN_NAME,
      mainPrefix: mainPrefix as MainPrefix,
      restText,
      senderID,
      rootPrefix,
    });
  });
}

await main();
