// XXX: 先前长期未更新的 snabbdom 还恰巧在前几天更新了新版本（`3.6.0`），新引入
// 的 bug 让其无法适用于目前的构建步骤，所以版本固定到了 `3.5.1`。

import packageJSON from "../package.json" assert { type: "json" };

import { h } from "snabbdom";
import toHTML from "snabbdom-to-html";

import { generateHTMLUsage } from "deck-adapters";

import { DEFAULT_ROOT_PREFIX } from "../src/consts.ts";

function main() {
  const rendered = generateHTMLUsage({
    rootPrefix: DEFAULT_ROOT_PREFIX,
    info: packageJSON,

    h,
    toHTML,
  });
  console.log(rendered);
}

main();
