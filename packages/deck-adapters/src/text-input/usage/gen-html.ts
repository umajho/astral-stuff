import type { h, VNode, VNodeChildren } from "snabbdom";
type H = typeof h;

import {
  arrayEntriesPolyfill,
  arrayFlatMapPolyfill,
  intersperse,
  objectEntriesPolyfill,
} from "js-utils";

import { CommandType, DeckName, localizeCommandType } from "deck-core";

import {
  COMMAND_EXAMPLES,
  COMMAND_USAGES,
  CommandUsage,
  generateCommandDescription,
  generateCommandFormat,
  generateCommandPrefixForUsageFormat,
} from "./commands/mod.ts";
import { generateCommandPrefixEx } from "../parsing/test-utils.ts";

export function generateHTMLUsage(opts: {
  rootPrefix: string;
  info: { version: string };

  h: H;
  toHTML: (vnode: VNode) => string;
}): string {
  return buildUsage(opts).map(opts.toHTML).join("");
}

function buildUsage(opts: {
  rootPrefix: string;
  info: { version: string };

  h: H;
}): VNode[] {
  const { h } = opts;

  return [
    h("h1", "用法"),
    h(
      "p",
      [
        "本文档由 ",
        h("code", "./scripts/generate-usage-html.ts"),
        " 生成，适用于插件版本 “",
        h("code", opts.info.version),
        "”",
      ],
    ),
    h("h2", "命令"),
    ...buildCommandsSectionOfUsage(opts),
  ];
}

function buildCommandsSectionOfUsage(opts: {
  rootPrefix: string;

  h: H;
}): VNode[] {
  const entries = objectEntriesPolyfill(COMMAND_USAGES);
  return arrayFlatMapPolyfill(entries, ([typ_, cmds]) => {
    const typ = typ_ as CommandType;
    return [
      ...buildCommandUsagesOfType(typ, cmds, opts),
    ];
  });
}

function buildCommandUsagesOfType(
  typ: CommandType,
  cmds: { [name: string]: CommandUsage },
  opts: {
    rootPrefix: string;

    h: H;
  },
): VNode[] {
  const { h } = opts;

  const entries = objectEntriesPolyfill(cmds);
  return arrayFlatMapPolyfill(entries, ([name, usage]) => {
    return [
      h("h3", `${localizeCommandType(typ)}::${name}`),
      ...buildCommandUsage(typ, name, usage, opts),
    ];
  });
}

function buildCommandUsage(
  typ: CommandType,
  name: string,
  usage: CommandUsage,
  opts: {
    rootPrefix: string;

    h: H;
  },
): VNode[] {
  const { h } = opts;

  const genOpts = { rootPrefix: opts.rootPrefix, commandName: name };

  const prefixForFormat = //
    generateCommandPrefixForUsageFormat(usage.prefixType, genOpts);
  const format = generateCommandFormat(usage, prefixForFormat + name, genOpts);
  const description = (() => {
    const description: VNodeChildren = [];
    const text = generateCommandDescription(usage, genOpts);
    const lines = text.split("\n");
    for (const [i, line] of arrayEntriesPolyfill(lines)) {
      description.push(line);
      if (i < lines.length - 1) {
        description.push(h("br"));
      }
    }
    return description;
  })();

  const prefixForExample = generateCommandPrefixEx(usage.prefixType, {
    ...genOpts,
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
