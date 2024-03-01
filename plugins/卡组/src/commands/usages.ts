import { exhaustive } from "../ts-utils.ts";

import {
  BetweenDecksCommand,
  CommandType,
  DeckCommand,
  DeckDiscardPileCommand,
  DeckExistenceCommand,
  DeckHandCommand,
  localizeCommandType,
  PluginCommand,
} from "./types.ts";

import {
  DESCRIPTION_AMOUNT_BEFORE_CARD_NAME_OMISSION,
  DESCRIPTION_AMOUNT_BEFORE_CARD_NAME_STRICT,
  DESCRIPTION_FORMAT_NEW_CARD,
  DESCRIPTION_SUFFIX_AT,
  DESCRIPTION_SUFFIX_TO_PRIVATE,
  FORMAT_ATTRIBUTE_SETTER_ANY,
  FORMAT_FLAG_SETTER_ANY,
  FORMAT_NEW_CARDS,
  SUFFIXES_AT,
} from "./usage-common-texts.ts";

export type CommandPrefixType =
  | "global"
  | "deck"
  | "deck_discard_pile"
  | "deck_hand";

export interface CommandUsage {
  /**
   * 前缀类型对应的前缀参见 `getCommandUsagePrefix` 函数。
   */
  prefixType: CommandPrefixType;
  /**
   * 命令名可能的后缀格式。
   * 比如对于卡组的 `添加` 命令，可以有后缀 ["", "于顶部", "于底部"]，显示为
   * `(于顶部|于底部)?`。
   */
  suffixes?: string[];
  /**
   * 不含前缀（包括前缀卡组名）、命令名及开头空白的命令参数的格式。
   * 若命令不存在参数，则省去本字段。
   * 比如，对于完整的命令 `卡组：<卡组名> 抽卡 <n>`，这里应该填 “<n>”。
   *
   * 文本替代语法：
   * - `{/}`：“卡组” 这个前缀；`{.}`：当前命令名；
   * - `\n` 会被替换为 `<换行>`。
   */
  argumentsFormat?: string;
  /**
   * 对命令的描述。
   *
   * 文本替代语法参见字段 `argumentsFormat`，但不包含针对 `\n` 规则。
   */
  description: string;
}

export const COMMAND_USAGES = {
  plugin: withPrefixType<PluginCommand["type"]>(
    "global",
    {
      "概览": {
        description: [
          "显示本插件概览。",
        ].join("\n"),
      },
      "帮助": {
        argumentsFormat: "<命令名>*",
        description: "显示于本插件有关的帮助信息。",
      },
      "列表": {
        description: "列出目前存在的卡组。",
      },
      "领域设置": {
        argumentsFormat: `${FORMAT_ATTRIBUTE_SETTER_ANY}`,
        description: "修改本插件针对当前领域的设置。",
      },
    },
  ),

  deck_existence: withPrefixType<DeckExistenceCommand["type"]>("deck", {
    "创建": {
      argumentsFormat:
        `${FORMAT_FLAG_SETTER_ANY}${FORMAT_ATTRIBUTE_SETTER_ANY}(\n---(顺序)?\n${FORMAT_NEW_CARDS})?`,
      description: [
        "创建本卡组。若卡组已经存在，报错。",
        [
          "若卡组名以 “.” 开头，该卡组视为卡组创建者的独有卡组，只有卡组创建者自己可以访问。",
          "不同的命令发起者创建的相同名称的独有卡组视为不同的卡组。",
        ].join(""),
        DESCRIPTION_FORMAT_NEW_CARD,
      ].join("\n"),
    },
    "销毁": {
      description: "销毁本卡组。若卡组不存在，报错。",
    },
    "导出": {
      description: "显示本卡组数据编码后的结果。",
    },
    "导入": {
      suffixes: ["创建", "覆盖"],
      argumentsFormat: "<data>",
      description: [
        "将 data 解码，并作为本卡组的数据。",
        "根据卡组目前创建与否，用 “创建” 来用导入的数据创建尚未创建的卡组，用 “覆盖” 来用导入的数据覆盖已经创建的卡组。",
      ].join("\n"),
    },
    "克隆为": {
      argumentsFormat: "<新卡组名>",
      description: [
        [
          "将本卡组克隆为新的卡组，本卡组和新卡组除名字外一切相同。",
          "若卡组已经存在，报错。",
        ].join(""),
        "若新卡组拥有 “+模板”，则从新卡组移除该旗帜。",
      ].join("\n"),
    },
    "重命名为": {
      argumentsFormat: "<新卡组名>",
      description: "重命名本卡组。若新名字对应的卡组已经存在，报错。",
    },
  }),

  deck: withPrefixType<DeckCommand["type"]>("deck", {
    "概览": {
      description: "显示本卡组的概览信息。",
    },
    "列表": {
      description:
        "列出本存在于卡组中的卡牌及对应的可公开信息。抽牌堆、弃牌堆与手牌中的卡牌都算在内。",
    },
    "查看": {
      argumentsFormat: "<卡名>+",
      description: "查看本卡组中对应卡牌的信息。",
    },
    "设置": {
      argumentsFormat:
        `${FORMAT_FLAG_SETTER_ANY}${FORMAT_ATTRIBUTE_SETTER_ANY}`,
      description: "修改本卡组的设置。",
    },
    "添加": {
      suffixes: SUFFIXES_AT,
      argumentsFormat: "<新卡牌>+",
      description: [
        "将输入的新卡牌凭空放任本卡组的抽牌堆。",
        DESCRIPTION_SUFFIX_AT,
        DESCRIPTION_FORMAT_NEW_CARD,
        DESCRIPTION_AMOUNT_BEFORE_CARD_NAME_OMISSION,
      ].join("\n"),
    },
    "删除": {
      argumentsFormat: "(((<数量>|全部)#)?<卡名>)+",
      description: [
        "从抽牌堆中删除指定卡牌。",
        DESCRIPTION_AMOUNT_BEFORE_CARD_NAME_STRICT,
      ].join("\n"),
    },
    "洗牌": {
      description: "打乱抽牌堆中卡牌的顺序。",
    },
    "回收全部并洗牌": {
      description: "将位于本卡组抽牌堆之外的卡牌全部放回抽牌堆之中，并洗牌。",
    },
    "抽卡": {
      suffixes: ["", "至私聊"],
      argumentsFormat: "<数量>?",
      description: [
        "抽指定数量张卡牌。若没有指定数量，则抽一张。",
        DESCRIPTION_SUFFIX_TO_PRIVATE,
      ].join("\n"),
    },
    "窥视": {
      suffixes: ["", "至私聊"],
      argumentsFormat: "<数量>?",
      description: [
        "查看抽牌堆顶部指定数量张卡牌。若没有指定数量，则查看一张。",
        DESCRIPTION_SUFFIX_TO_PRIVATE,
      ].join("\n"),
    },
  }),

  deck_discard_pile: withPrefixType<
    DeckDiscardPileCommand["type"]
  >("deck_discard_pile", {
    "列表": {
      description: "列出本存在于本卡组弃牌堆中的卡牌及对应的可公开信息。",
    },
    "回收": {
      suffixes: SUFFIXES_AT,
      argumentsFormat: "(((<数量>|全部)#)?<卡名>)+",
      description: [
        "将本卡组弃牌堆中指定的卡牌放回抽牌堆之中。",
        DESCRIPTION_SUFFIX_AT,
        DESCRIPTION_AMOUNT_BEFORE_CARD_NAME_OMISSION,
      ].join("\n"),
    },
    "回收全部并洗牌": {
      description: "将位于本卡组弃牌堆中的卡牌全部放回抽牌堆之中，并洗牌。",
    },
    "删除全部": {
      description: "删除本卡组弃牌堆中全部的卡牌。",
    },
  }),

  deck_hand: withPrefixType<DeckHandCommand["type"]>("deck_hand", {
    "列表": {
      description: [
        "列出存在于目标手牌中的卡牌及对应的可公开信息。",
      ].join("\n"),
    },
    "加入": {
      argumentsFormat: "(((<数量>|全部)#)?<卡名>)+",
      description: [
        "将抽牌堆中指定的卡牌加入目标手牌。",
        DESCRIPTION_AMOUNT_BEFORE_CARD_NAME_OMISSION,
      ].join("\n"),
    },
    "丢弃": {
      argumentsFormat: "(((<数量>|全部)#)?<卡名>)+",
      description: [
        "丢弃目标手牌中的指定卡牌。",
        DESCRIPTION_AMOUNT_BEFORE_CARD_NAME_OMISSION,
      ].join("\n"),
    },
    "丢弃全部": {
      description: "丢弃目标手牌中全部的卡牌。",
    },
    "回收": {
      suffixes: SUFFIXES_AT,
      argumentsFormat: "(((<数量>|全部)#)?<卡名>)+",
      description: [
        "将目标手牌中指定的卡牌放回抽牌堆之中。",
        DESCRIPTION_SUFFIX_AT,
        DESCRIPTION_AMOUNT_BEFORE_CARD_NAME_OMISSION,
      ].join("\n"),
    },
    "回收全部并洗牌": {
      description: "将位于目标手牌中的卡牌全部放回抽牌堆之中，并洗牌。",
    },
    "转让至": {
      argumentsFormat: "<@所属者> (((<数量>|全部)#)?<卡名>)+",
      description: [
        "将目标手牌中指定的卡牌转让给指定的所属者。",
        DESCRIPTION_AMOUNT_BEFORE_CARD_NAME_OMISSION,
      ].join("\n"),
    },
  }),

  between_decks: withPrefixType<BetweenDecksCommand["type"]>("deck", {
    "全部添加至": {
      argumentsFormat: "<卡组名>",
      description:
        "将本卡组的所有卡牌添加至另一套卡组。若另一套卡组不存在，报错。",
    },
    "挑选添加至": {
      argumentsFormat: "<卡组名> (((<数量>|全部)#)?<卡名>)+",
      description: [
        "将挑选出的卡牌添加至另一套卡组，本卡组不变。",
        DESCRIPTION_AMOUNT_BEFORE_CARD_NAME_OMISSION,
      ].join("\n"),
    },
    "挑选转移至": {
      argumentsFormat: "<卡组名> (((<数量>|全部)#)?<卡名>)+",
      description: [
        "将挑选出的卡牌添加至另一套卡组，然后将它们从本卡组中删除。",
        DESCRIPTION_AMOUNT_BEFORE_CARD_NAME_STRICT,
      ].join("\n"),
    },
  }),
};

/**
 * 各命令的示例，每条示范跟 `CommandUsage` 的字段 `argumentsFormat` 一样不含前
 * 缀、命令名及开头。
 *
 * 文本替代语法参见 `CommandUsage` 的字段 `argumentsFormat`。
 */
export const COMMAND_EXAMPLES = {
  plugin: {
    "概览": [],
    "帮助": ["", "卡组存在::创建"],
    "列表": [],
    "领域设置": ["\n默认卡组 塔罗牌"],
  },
  deck_existence: {
    "创建": [
      "",
      "+不放回",
      "+私聊添加+保密描述",
      "+不放回 +领域默认\n日志输出群 1234567890",
      "+放回不独立\n---\n愚者正位「」愚者逆位「」",
      "+放回不独立\n---\n愚者正位「」\n愚者逆位「」",
      "+不放回\n---\n4#一条「上面刻着一只麻雀。」4#白「上面并没有刻字。」",
      "+不放回\n---顺序\n1「」2「」3「」4「」5「」",
    ],
    "销毁": [],
    "导出": [],
    "导入": ["Il9fRVhBTVBMRV9fIg=="],
    "克隆为": ["第二副牌"],
    "重命名为": ["新名字"],
  },
  deck: {
    "概览": [],
    "列表": [],
    "查看": ["愚者正位 世界逆位"],
    "设置": [
      "+闸停-保密描述",
      "\n日志输出群 1234567890",
      "+闸停-保密描述\n日志输出群 1234567890",
    ],
    "添加": [
      "愚者正位「」愚者逆位「」",
      "\n愚者正位「」\n愚者逆位「」",
      "4#一条「上面刻着一只麻雀。」4#白「上面并没有刻字。」",
    ],
    "删除": ["全部#要全都删的卡牌 只要删一张的卡牌 3#要删三张的卡牌"],
    "洗牌": [],
    "回收全部并洗牌": [],
    "抽卡": ["", "3"],
    "窥视": ["", "3"],
  },
  deck_discard_pile: {
    "列表": [],
    "回收": ["召唤魔术"],
    "回收全部并洗牌": [],
    "删除全部": [],
  },
  deck_hand: {
    "列表": [],
    "加入": ["闪亮登场"],
    "丢弃": ["某某某"],
    "丢弃全部": [],
    "回收": ["某某某"],
    "回收全部并洗牌": [],
    "转让至": ["9876543210 某某某"],
  },
  between_decks: {
    "全部添加至": ["另一副牌"],
    "挑选添加至": ["另一副牌 全部#某某某"],
    "挑选转移至": ["另一副牌 全部#某某某"],
  },
} as const satisfies {
  [Type in CommandType]: {
    [Name in keyof (typeof COMMAND_USAGES)[Type]]: readonly string[];
  };
};

export function generateCommandUsageText(
  commandName: string,
  usage: CommandUsage,
  examples: string[],
  opts: { rootPrefix: string },
): string {
  const genOpts = { ...opts, commandName };

  const head = generateCommandPrefixForUsageFormat(usage.prefixType, opts) +
    commandName;
  const format = generateCommandFormat(usage, head, genOpts);
  const description = generateCommandDescription(usage, genOpts);

  const lines = [
    `“${format}”`,
    description.split("\n").map((l) => "　　" + l).join("\n"),
  ];

  if (examples.length) {
    lines.push("示例：");
    for (const example of examples) {
      lines.push(
        "　　" +
          generateCommandExample(example, head + (usage.suffixes?.[0] ?? ""), {
            ...genOpts,
            substitutesNewLine: true,
          }),
      );
    }
  }

  return lines.join("\n");
}

export function generateCommandFormat(
  usage: CommandUsage,
  head: string,
  opts: { rootPrefix: string; commandName: string },
) {
  const restFormat = generateFormatFromOneOf(usage.suffixes) +
    (usage.argumentsFormat ? " " + usage.argumentsFormat : "");
  return head + substituteText(restFormat, {
    handlesNewLines: true,
    ...opts,
  });
}

export function generateCommandDescription(
  usage: CommandUsage,
  opts: { rootPrefix: string; commandName: string },
) {
  return substituteText(usage.description, opts);
}

export function generateCommandExample(
  example: string,
  head: string,
  opts: {
    rootPrefix: string;
    commandName: string;
    substitutesNewLine: boolean;
  },
) {
  return head + " " + substituteText(example, {
    rootPrefix: opts.rootPrefix,
    commandName: opts.commandName,
    handlesNewLines: opts.substitutesNewLine,
  });
}

export function appendErrorMessageWithCommandUsage<
  T,
  Type extends CommandType,
>(
  err: ["error", string, T?],
  cmdType: Type,
  cmdName_: keyof (typeof COMMAND_USAGES)[Type],
  opts: { rootPrefix: string },
): ["error", string, T?] {
  const usage = COMMAND_USAGES[cmdType][cmdName_] as CommandUsage;
  // @ts-ignore
  const examples = COMMAND_EXAMPLES[cmdType][cmdName_] as string[];
  const cmdName = cmdName_ as string;
  const cmdTypL10n = localizeCommandType(cmdType);
  const usageText =
    `发送 “${opts.rootPrefix}帮助 ${cmdTypL10n}::${cmdName}” 查询该命令的用法。`;
  const msg = err[1] + `\n\n（${usageText}）`;
  return err.length === 3 ? ["error", msg, err[2]] : ["error", msg];
}

function generateFormatFromOneOf(choices?: string[]): string {
  const count = choices?.filter((x) => x).length;
  if (!choices || !count) return "";
  const isOptional = choices.some((x) => !x);
  const nonEmptyChoicesText = choices.filter((x) => x).join("|");
  const needsParen = count > 1 || isOptional;
  return (needsParen ? "(" : "") + nonEmptyChoicesText +
    (needsParen ? ")" : "") + (isOptional ? "?" : "");
}

export function generateCommandPrefixForUsageFormat(
  prefixType: CommandPrefixType,
  opts: { rootPrefix: string },
): string {
  switch (prefixType) {
    case "global":
      return `${opts.rootPrefix}`;
    case "deck":
      return `${opts.rootPrefix}：<卡组名> `;
    case "deck_discard_pile":
      return `${opts.rootPrefix}：<卡组名> 弃牌堆`;
    case "deck_hand":
      return `${opts.rootPrefix}：<卡组名> 手牌(：<@所属者> )?`;
    default:
      exhaustive(prefixType);
  }
}

interface SubstituteTextOptions {
  rootPrefix: string;
  commandName: string;
  handlesNewLines?: boolean;
}
function substituteText(
  input: string,
  opts: SubstituteTextOptions,
): string {
  let output = input
    .replace(/\{\/\}/g, opts.rootPrefix)
    .replace(/\{\.\}/g, opts.commandName);

  if (opts.handlesNewLines) {
    output = output.replace(/\n/g, "<换行>");
  }

  return output;
}

function withPrefixType<T extends string>(
  prefixType: CommandPrefixType,
  usages: { [Name in T]: Omit<CommandUsage, "prefixType"> },
): { [Name in T]: CommandUsage } {
  const result: any = {};
  for (const name in usages) {
    result[name] = { prefixType, ...usages[name] };
  }
  return result;
}

function getCommandPrefixTypeOfCommandType(
  typ: CommandType,
): CommandPrefixType {
  switch (typ) {
    case "plugin":
      return "global";
    case "deck_existence":
    case "between_decks":
      return "deck";
    default:
      return typ;
  }
}

/**
 * 找到对应名称的命令，收集这些命令的用法头部。
 *
 * 比如对于名称 “概览”，有命令 “插件::概览” 和 “卡组::概览”，这两个命令的用法头
 * 部分别为 `"卡组概览"` 和 `"卡组：<卡组名> 概览"`。
 */
export function findCommandUsageHeadsByName(
  name: string,
  opts: {
    rootPrefix: string;
    excludedCommandTypes?: CommandType[];
  },
): string[] {
  const output: string[] = [];
  for (const cmdType_ in COMMAND_USAGES) {
    const cmdType = cmdType_ as CommandType;
    if (
      opts.excludedCommandTypes &&
      opts.excludedCommandTypes.indexOf(cmdType) >= 0
    ) {
      continue;
    }
    const cmds = COMMAND_USAGES[cmdType];
    if (name in cmds) {
      const prefixType = getCommandPrefixTypeOfCommandType(cmdType);
      const head = generateCommandPrefixForUsageFormat(prefixType, opts) + name;
      output.push(head);
    }
  }
  return output;
}
