// FIXME: ts-node 不知为何不识别 `.ts` 扩展名，就先用 deno 凑合了。为此
// `tsconfig.json` 也设置了 `"allowImportingTsExtensions": true` 和
// `"noEmit": true`，否则没原封不动的 `.ts` 扩展名 deno 就引入不了模块。创建
// `deno.d.ts` 也只是为了让 vscode 能识别 npm 包的类型，这也让 deno 用到的 npm
// 包也要在 node 那边作为依赖，从而重复下载两次。另，先前长期未更新的 snabbdom
// 还恰巧在前几天更新了新版本（`3.6.0`），新引入的 bug 让 deno 用不了，所以 deno
// 这边在用版本 `3.5.1`。

import packageJSON from "../package.json" assert { type: "json" };

import { h, VNode, VNodeChildren } from "npm:snabbdom@3.5.1";
import toHTML from "npm:snabbdom-to-html@7.1.0";

import { intersperse } from "../src/js-utils.ts";

import {
  COMMAND_EXAMPLES,
  COMMAND_USAGES,
  CommandUsage,
  generateCommandDescription,
  generateCommandFormat,
  generateCommandPrefixForUsageFormat,
} from "../src/commands/usages.ts";
import { CommandType, localizeCommandType } from "../src/commands/types.ts";
import { ROOT_PREFIX } from "../src/consts.ts";
import { generateCommandPrefixEx } from "../src/commands/test-utils.ts";
import { DeckName } from "../src/ids.ts";

function main() {
  console.log(generateUsage());
}

function generateUsage(): string {
  return buildUsage().map(toHTML).join("");
}

function buildUsage(): VNode[] {
  return [
    h("h1", "用法"),
    h(
      "p",
      [
        "本文档由 ",
        h("code", "./scripts/generate-usage-html.ts"),
        " 生成，适用于插件版本 “",
        h("code", packageJSON.version),
        "”",
      ],
    ),
    h("h2", "命令"),
    ...buildCommandsSectionOfUsage(),
  ];
}

function buildCommandsSectionOfUsage(): VNode[] {
  return Object.entries(COMMAND_USAGES).flatMap(([typ_, cmds]) => {
    const typ = typ_ as CommandType;
    return [
      ...buildCommandUsagesOfType(typ, cmds),
    ];
  });
}

function buildCommandUsagesOfType(
  typ: CommandType,
  cmds: { [name: string]: CommandUsage },
): VNode[] {
  return Object.entries(cmds).flatMap(([name, usage]) => {
    return [
      h("h3", [
        h(
          "sup",
          { style: { "font-size": "x-small" } },
          `(${localizeCommandType(typ)})`,
        ),
        `「${name}」`,
      ]),
      ...buildCommandUsage(typ, name, usage),
    ];
  });
}

function buildCommandUsage(
  typ: CommandType,
  name: string,
  usage: CommandUsage,
): VNode[] {
  const opts = { rootPrefix: ROOT_PREFIX, commandName: name };

  const prefixForFormat = //
    generateCommandPrefixForUsageFormat(usage.prefixType, opts);
  const format = generateCommandFormat(usage, prefixForFormat + name, opts);
  const description = (() => {
    const description: VNodeChildren = [];
    const text = generateCommandDescription(usage, opts);
    const lines = text.split("\n");
    for (const [i, line] of lines.entries()) {
      description.push(line);
      if (i < lines.length - 1) {
        description.push(h("br"));
      }
    }
    return description;
  })();

  const prefixForExample = generateCommandPrefixEx(usage.prefixType, {
    ...opts,
    deckName: new DeckName("XXX"),
    handOwner: null,
  });
  // @ts-ignore
  const exampleTexts = COMMAND_EXAMPLES[typ][name] as string[];
  const examples = exampleTexts.map((example): VNodeChildren => {
    const head: VNodeChildren = [
      h("span", { style: { "font-size": "x-small" } }, prefixForExample),
      h("span", { style: { "font-size": "small" } }, name),
      ...(usage.suffixes
        ? [h("span", { style: { "font-size": "x-small" } }, usage.suffixes[0])]
        : []),
      " ",
    ];
    const lines = example.split("\n");
    if (lines.length === 1) {
      return [h("code", [...head, h("strong", example)])];
    } else {
      return intersperse(
        lines.map((line, i) =>
          h("code", [...(i === 0 ? head : []), h("strong", line)])
        ),
        h("br"),
      );
    }
  });

  return [
    h("dl", [
      h("dt", "格式"),
      h("dd", h("code", format)),
      h("dt", "描述"),
      h("dd", description),
      ...(examples.length
        ? [
          h("dt", "示例"),
          h("dd", [h("ul", examples.map((example) => h("li", example)))]),
        ]
        : []),
    ]),
  ];
}

main();
