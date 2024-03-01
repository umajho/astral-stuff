import { atob } from "js-base64";

import { trimSpacesExceptNewLines } from "../js-utils.ts";
import { exhaustive } from "../ts-utils.ts";

import {
  errorBadArguments,
  errorShouldHaveArguments,
  errorShouldNotHaveArguments,
  errorUnknownCommand,
} from "../errors.ts";
import { CardName, DeckName, UserID } from "../ids.ts";

import {
  AttributeSetters,
  BetweenDecksCommand,
  CardNameWithDescriptionAndOptionalAmount,
  CardNameWithOptionalAmount,
  Command,
  CommandType,
  DeckCommand,
  DeckDiscardPileCommand,
  DeckExistenceCommand,
  DeckHandCommand,
  PluginCommand,
} from "./types.ts";
import {
  appendErrorMessageWithCommandUsage,
  findCommandUsageHeadsByName,
} from "./usages.ts";

const MAX_SAFE_INTEGER = 9_007_199_254_740_991;

/**
 * 解析输入的命令。
 * @param input 完整形式的命令去掉主前缀（“卡组” 两字）。
 * 比如，如果原始消息是 “卡组：Foo 抽卡 …”，传入这里的就应该是 “：Foo 抽卡 …”，
 * 如果原始消息是 “卡组列表”，传入这里的就应该是 “列表”。
 */
export function parseCommand(
  input: string,
  opts: { rootPrefix: string },
): ["ok", Command] | ["error", string, any?] | ["ignore"] {
  const didInputHaveLeadingSpaces = /^\s/.test(input);
  input = input.trim();
  if (!/^[:：]/.test(input)) { // 不以冒号开头，说明是和单独卡组无关的插件级别命令
    const TYPE: CommandType = "plugin";

    const [cmd, rest] = splitByFirstNonLeadingSpaces(input);

    const result = tryParsePluginCommand(cmd, rest, opts);
    switch (result[0]) {
      case "ok":
        return ["ok", { type: TYPE, payload: result[1] }];
      case "error":
        return appendErrorMessageWithCommandUsage(
          ["error", result[1]],
          TYPE,
          result[2].commandName,
          opts,
        );
      case "not_found":
        const possibleIntentions = findCommandUsageHeadsByName(cmd, {
          rootPrefix: opts.rootPrefix,
          excludedCommandTypes: ["plugin"],
        });
        if (possibleIntentions.length) {
          return [
            "error",
            [
              `（是否其实想使用：${
                possibleIntentions.map((x) => `“${x}”`).join("")
              }？）`,
            ].join("\n"),
          ];
        }

        return didInputHaveLeadingSpaces
          ? errorUnknownCommand(TYPE, cmd) // 专门留了空白，很可能是输错了命令。
          : ["ignore"]; // 没专门留空白，更可能是以 “卡组” 开头的一般对话。
      default:
        exhaustive(result[0]);
    }
  } else {
    const [deckName, rest] = splitByFirstNonLeadingSpaces(input.slice(1));
    return parseDeckCommand(rest, new DeckName(deckName), opts);
  }
}

function tryParsePluginCommand(
  cmd: string,
  rest: string | null,
  opts: { rootPrefix: string },
):
  | ["ok", PluginCommand]
  | ["error", string, { commandName: PluginCommand["type"] }]
  | ["not_found"] {
  const TYPE: CommandType = "plugin";
  if (rest) {
    rest = trimSpacesExceptNewLines(rest);
  }

  switch (cmd) {
    case "":
    case "概览":
      if (!rest) return ["ok", { type: "概览" }];
      return errorShouldNotHaveArguments(TYPE, "概览");

    case "帮助":
      if (!rest) return ["ok", { type: "帮助", filters: null }];
      return ["ok", { type: "帮助", filters: rest.split(/\s+/) }];

    case "列表":
      if (!rest) return ["ok", { type: cmd }];
      return errorShouldNotHaveArguments(TYPE, cmd);

    case "领域设置": {
      const lines = (rest ?? "").split("\n");
      if (lines[0].trim()) {
        return errorBadArguments(TYPE, cmd, "第一行不能带有参数");
      }
      const result = parseAttributeSetters(lines.slice(1));
      if (result[0] === "error") return errorBadArguments(TYPE, cmd, result[1]);
      return ["ok", { type: "领域设置", attributeSetters: result[1] }];
    }

    default:
      return ["not_found"];
  }
}

/**
 * 解析输入的与单独卡组相关的命令。
 * @param input 与单独卡组相关的命令完整形式为 “卡组：<卡组名> …”，这里的输入应
 * 该为上述 “卡组名” 之后的部分。
 * 比如，如果原始消息是 “卡组：Foo 抽卡 …”，传入这里的就应该是 “抽卡 …”。
 */
export function parseDeckCommand(
  input: string | null,
  deckName: DeckName,
  opts: { rootPrefix: string },
): ["ok", Command] | ["error", string, any?] {
  const [cmd, rest] = splitByFirstNonLeadingSpaces(input ?? "");

  if (!cmd || cmd === "概览") {
    const TYPE: CommandType = "deck";
    if (!rest) {
      return ["ok", { type: TYPE, deckName, payload: { type: "概览" } }];
    }
    return errorShouldNotHaveArguments(TYPE, "概览");
  }

  {
    const TYPE: CommandType = "deck_existence";

    const result = tryParseDeckExistenceCommand(cmd, rest);
    switch (result[0]) {
      case "ok":
        return ["ok", { type: TYPE, deckName, payload: result[1] }];
      case "error":
        return appendErrorMessageWithCommandUsage(
          result,
          TYPE,
          result[2].commandName,
          opts,
        );
      case "not_found":
        break;
      default:
        exhaustive(result[0]);
    }
  }

  {
    const TYPE: CommandType = "deck";

    const result = tryParseDeckCommand(cmd, rest);
    switch (result[0]) {
      case "ok":
        return ["ok", { type: TYPE, deckName, payload: result[1] }];
      case "error":
        return appendErrorMessageWithCommandUsage(
          result,
          TYPE,
          result[2].commandName,
          opts,
        );
      case "not_found":
        break;
      default:
        exhaustive(result[0]);
    }
  }

  if (/^弃牌堆/.test(cmd)) {
    const TYPE: CommandType = "deck_discard_pile";
    const [subCmd, subRest] = cmd === "弃牌堆"
      ? splitByFirstNonLeadingSpaces(rest ?? "")
      : [cmd.slice(3), rest];
    const result = tryParseDeckDiscardPileCommand(subCmd, subRest);
    switch (result[0]) {
      case "ok":
        const payload = result[1];
        return ["ok", { type: TYPE, deckName, payload }];
      case "error":
        return appendErrorMessageWithCommandUsage(
          result,
          TYPE,
          result[2].commandName,
          opts,
        );
      case "not_found":
        return errorUnknownCommand(TYPE, subCmd);
      default:
        exhaustive(result[0]);
    }
  }

  if (/^手牌/.test(cmd)) {
    const TYPE: CommandType = "deck_hand";

    let subCmd, subRest;
    let userID: UserID | null = null;
    if (/^手牌[:：]/.test(cmd) || cmd === "手牌") {
      [subCmd, subRest] = splitByFirstNonLeadingSpaces(rest ?? "");
      if (/^手牌[:：]/.test(cmd)) {
        userID = new UserID(cmd.slice(3));
      }
    } else {
      [subCmd, subRest] = [cmd.slice(2), rest];
    }
    const result = tryParseDeckHandCommand(subCmd, subRest);
    switch (result[0]) {
      case "ok":
        const payload = result[1];
        return ["ok", { type: TYPE, deckName, userID, payload }];
      case "error":
        return appendErrorMessageWithCommandUsage(
          result,
          TYPE,
          result[2].commandName,
          opts,
        );
      case "not_found":
        return errorUnknownCommand(TYPE, subCmd);
      default:
        exhaustive(result[0]);
    }
  }

  {
    const TYPE: CommandType = "between_decks";

    const result = tryParseBetweenDecksCommand(cmd, rest);
    switch (result[0]) {
      case "ok":
        return ["ok", {
          type: TYPE,
          subjectDeckName: deckName,
          objectDeckName: result[2],
          payload: result[1],
        }];
      case "error":
        return appendErrorMessageWithCommandUsage(
          result,
          TYPE,
          result[2].commandName,
          opts,
        );
      case "not_found":
        break;
      default:
        exhaustive(result[0]);
    }
  }

  // NOTE: "between_decks" 形式上和 "deck" 一样，这里填更广义的后者。
  return errorUnknownCommand("deck", cmd);
}

function tryParseDeckExistenceCommand(
  cmd: string,
  rest: string | null,
):
  | ["ok", DeckExistenceCommand]
  | ["error", string, { commandName: DeckExistenceCommand["type"] }]
  | ["not_found"] {
  const TYPE: CommandType = "deck_existence";
  if (rest) {
    rest = trimSpacesExceptNewLines(rest);
  }

  switch (cmd) {
    case "创建": {
      const lines = (rest ?? "").split("\n");
      const firstLineRest = lines[0].trim();
      let flagSetters: string[] = [];
      if (firstLineRest) {
        const result = parseFlagSetters(firstLineRest);
        if (result[0] === "error") {
          return errorBadArguments(TYPE, cmd, result[1]);
        }
        flagSetters = result[1];
      }

      const [attributeLines, cardsText, separatorRest] = (() => {
        const restLines = lines.slice(1);
        let idxSeparator = -1;
        for (let i = 0; i < restLines.length; i++) {
          if (/^---/.test(restLines[i])) {
            idxSeparator = i;
            break;
          }
        }
        if (idxSeparator >= 0) {
          const separatorRest = /^-+(.*)/.exec(restLines[idxSeparator])![1];
          return [
            restLines.slice(0, idxSeparator),
            restLines.slice(idxSeparator + 1).join("\n"),
            separatorRest.trim(),
          ];
        } else {
          return [restLines, "", null];
        }
      })();

      let cards: CardNameWithDescriptionAndOptionalAmount[] = [];
      let keepsOrderOfCards = false;
      if (cardsText || separatorRest) {
        if (cardsText) {
          const result = parseNewCards(cardsText);
          if (result[0] === "error") {
            return errorBadArguments(TYPE, cmd, result[1]);
          }
          cards = result[1];
        }

        if (separatorRest) {
          if (separatorRest === "顺序") {
            keepsOrderOfCards = true;
          } else {
            return errorBadArguments(
              TYPE,
              cmd,
              `无法理解位于分隔符之后的 “${separatorRest}”`,
            );
          }
        }
      }

      const result = parseAttributeSetters(attributeLines);
      if (result[0] === "error") return errorBadArguments(TYPE, cmd, result[1]);
      return ["ok", {
        type: "创建",
        flagSetters,
        attributeSetters: result[1],
        cards,
        keepsOrderOfCards,
      }];
    }

    case "销毁":
    case "导出":
      if (!rest) return ["ok", { type: cmd }];
      return errorShouldNotHaveArguments(TYPE, cmd);

    case "导入创建":
    case "导入覆盖": {
      const mode = /创建/.test(cmd) ? "create" : "overwrite";
      if (!rest) return errorBadArguments(TYPE, "导入", "缺少参数");
      let data: string;
      try {
        data = JSON.parse(atob(rest.trim()));
      } catch (e) {
        const restMsg = (e instanceof Error) ? "：\n" + e.message : "";
        return errorBadArguments(TYPE, "导入", "解析数据失败" + restMsg);
      }
      return ["ok", { type: "导入", mode, data }];
    }

    case "克隆为":
    case "重命名为": {
      const dest = rest?.trim() ?? null;
      if (!dest) return errorShouldHaveArguments(TYPE, cmd);
      if (/\s/.test(dest)) {
        return errorBadArguments(TYPE, cmd, "卡组名中不能包含空白");
      }
      return ["ok", { type: cmd, destination: new DeckName(dest) }];
    }

    default:
      return ["not_found"];
  }
}

function tryParseDeckCommand(
  cmd: string,
  rest: string | null,
):
  | ["ok", DeckCommand]
  | ["error", string, { commandName: DeckCommand["type"] }]
  | ["not_found"] {
  const TYPE: CommandType = "deck";
  if (rest) {
    rest = trimSpacesExceptNewLines(rest);
  }

  switch (cmd) {
    case "列表":
      if (!rest) return ["ok", { type: cmd }];
      return errorShouldNotHaveArguments(TYPE, cmd);

    case "查看": {
      const names = rest?.trim();
      if (!names) return errorBadArguments(TYPE, cmd, "未提供卡名");

      return ["ok", {
        type: "查看",
        cards: names.split(/\s+/).filter((x) => x).map((x) => new CardName(x)),
      }];
    }

    case "设置": {
      const lines = (rest ?? "").split("\n");
      const firstLineRest = lines[0].trim();
      let flagSetters: string[] = [];
      if (firstLineRest) {
        const result = parseFlagSetters(firstLineRest);
        if (result[0] === "error") {
          return errorBadArguments(TYPE, cmd, result[1]);
        }
        flagSetters = result[1];
      }

      const result = parseAttributeSetters(lines.slice(1));
      if (result[0] === "error") return errorBadArguments(TYPE, cmd, result[1]);
      return ["ok", { type: "设置", flagSetters, attributeSetters: result[1] }];
    }

    case "添加":
    case "添加于顶部":
    case "添加于底部": {
      const cardsText = rest?.trim();
      if (!cardsText) return errorShouldHaveArguments(TYPE, "添加");

      const at = (() => {
        if (/顶部/.test(cmd)) return "top";
        if (/底部/.test(cmd)) return "bottom";
        return null;
      })();

      const result = parseNewCards(cardsText);
      if (result[0] === "error") {
        return errorBadArguments(TYPE, "添加", result[1]);
      }
      return ["ok", { type: "添加", at, cards: result[1] }];
    }

    case "删除": {
      const cardsText = rest?.trim() ?? "";
      if (!cardsText) return errorShouldHaveArguments(TYPE, cmd);

      const result = parseCardSpecifiers(cardsText);
      if (result[0] === "error") return errorBadArguments(TYPE, cmd, result[1]);
      return ["ok", { type: "删除", cards: result[1] }];
    }

    case "抽卡":
    case "抽牌":
    case "抽卡至私聊":
    case "抽牌至私聊":
    case "窥视":
    case "窥视至私聊": {
      const to = /至私聊/.test(cmd) ? "senderPrivate" : "currentPlace";
      let amount = null;
      if (rest) {
        if (!/\d+/.test(rest)) {
          return errorBadArguments(TYPE, "抽卡", "数量需为非负整数");
        }
        amount = Number(rest);
        if (amount > MAX_SAFE_INTEGER) {
          return errorBadArguments(TYPE, "抽卡", "数量过大");
        }
      }
      return [
        "ok",
        { type: /^抽[卡牌]/.test(cmd) ? "抽卡" : "窥视", to, amount },
      ];
    }

    case "洗牌":
    case "回收全部并洗牌":
      if (!rest) return ["ok", { type: cmd }];
      return errorShouldNotHaveArguments(TYPE, cmd);

    default:
      return ["not_found"];
  }
}

function tryParseDeckDiscardPileCommand(
  cmd: string,
  rest: string | null,
):
  | ["ok", DeckDiscardPileCommand]
  | ["error", string, { commandName: DeckDiscardPileCommand["type"] }]
  | ["not_found"] {
  const TYPE: CommandType = "deck_discard_pile";
  if (rest) {
    rest = trimSpacesExceptNewLines(rest);
  }

  switch (cmd) {
    case "列表":
      if (!rest) return ["ok", { type: cmd }];
      return errorShouldNotHaveArguments(TYPE, cmd);

    case "回收":
    case "回收于顶部":
    case "回收于底部": {
      const cardsText = rest?.trim();
      if (!cardsText) return errorShouldHaveArguments(TYPE, "回收");

      const at = (() => {
        if (/顶部/.test(cmd)) return "top";
        if (/底部/.test(cmd)) return "bottom";
        return null;
      })();

      const result = parseCardSpecifiers(cardsText);
      if (result[0] === "error") {
        return errorBadArguments(TYPE, "回收", result[1]);
      }
      return ["ok", { type: "回收", at, cards: result[1] }];
    }

    case "回收全部并洗牌":
      if (!rest) return ["ok", { type: cmd }];
      return errorShouldNotHaveArguments(TYPE, cmd);

    case "删除全部":
      if (!rest) return ["ok", { type: cmd }];
      return errorShouldNotHaveArguments(TYPE, cmd);

    default:
      return ["not_found"];
  }
}

function tryParseDeckHandCommand(
  cmd: string,
  rest: string | null,
):
  | ["ok", DeckHandCommand]
  | ["error", string, { commandName: DeckHandCommand["type"] }]
  | ["not_found"] {
  const TYPE: CommandType = "deck_hand";
  if (rest) {
    rest = trimSpacesExceptNewLines(rest);
  }

  switch (cmd) {
    case "列表":
      if (!rest) return ["ok", { type: cmd }];
      return errorShouldNotHaveArguments(TYPE, cmd);

    case "加入":
    case "丢弃": {
      const cardsText = rest?.trim();
      if (!cardsText) return errorShouldHaveArguments(TYPE, cmd);

      const result = parseCardSpecifiers(cardsText);
      if (result[0] === "error") {
        return errorBadArguments(TYPE, cmd, result[1]);
      }
      return ["ok", { type: cmd, cards: result[1] }];
    }

    case "丢弃全部":
      if (!rest) return ["ok", { type: cmd }];
      return errorShouldNotHaveArguments(TYPE, cmd);

    case "回收":
    case "回收于顶部":
    case "回收于底部": {
      const cardsText = rest?.trim();
      if (!cardsText) return errorShouldHaveArguments(TYPE, "回收");

      const at = (() => {
        if (/顶部/.test(cmd)) return "top";
        if (/底部/.test(cmd)) return "bottom";
        return null;
      })();

      const result = parseCardSpecifiers(cardsText);
      if (result[0] === "error") {
        return errorBadArguments(TYPE, "回收", result[1]);
      }
      return ["ok", { type: "回收", at, cards: result[1] }];
    }

    case "回收全部并洗牌":
      if (!rest) return ["ok", { type: cmd }];
      return errorShouldNotHaveArguments(TYPE, cmd);

    case "转让至": {
      rest = rest?.trim() ?? null;
      if (!rest) return errorShouldHaveArguments(TYPE, cmd);
      const [destText, cardsText_] = splitByFirstNonLeadingSpaces(rest);
      const cardsText = cardsText_?.trim();
      if (!cardsText) return errorShouldHaveArguments(TYPE, cmd);

      const result = parseCardSpecifiers(cardsText);
      if (result[0] === "error") {
        return errorBadArguments(TYPE, "转让至", result[1]);
      }
      const destID = new UserID(destText);
      return ["ok", { type: "转让至", receiverID: destID, cards: result[1] }];
    }

    default:
      return ["not_found"];
  }
}

function tryParseBetweenDecksCommand(
  cmd: string,
  rest: string | null,
):
  | ["ok", BetweenDecksCommand, DeckName]
  | ["error", string, { commandName: BetweenDecksCommand["type"] }]
  | ["not_found"] {
  const TYPE: CommandType = "between_decks";
  if (rest) {
    rest = trimSpacesExceptNewLines(rest);
  }

  switch (cmd) {
    case "全部添加至": {
      const dest = rest?.trim() ?? null;
      if (!dest) return errorShouldHaveArguments(TYPE, cmd);
      if (/\s/.test(dest)) {
        return errorBadArguments(TYPE, cmd, "卡组名中不能包含空白");
      }
      return ["ok", { type: cmd }, new DeckName(dest)];
    }

    case "挑选添加至":
    case "挑选转移至": {
      rest = rest?.trim() ?? null;
      if (!rest) return errorShouldHaveArguments(TYPE, cmd);
      const [destText, cardsText_] = splitByFirstNonLeadingSpaces(rest);
      const cardsText = cardsText_?.trim();
      if (!cardsText) return errorShouldHaveArguments(TYPE, cmd);

      const result = parseCardSpecifiers(cardsText);
      if (result[0] === "error") {
        return errorBadArguments(TYPE, cmd, result[1]);
      }
      return ["ok", { type: cmd, cards: result[1] }, new DeckName(destText)];
    }

    default:
      return ["not_found"];
  }
}

function parseAttributeSetters(lines: string[]):
  | ["ok", AttributeSetters]
  | ["error", string] {
  const setters: AttributeSetters = {};
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    const [name, value] = splitByFirstNonLeadingSpaces(line);
    if (name in setters) {
      return ["error", `属性「${name}」出现多次`];
    }
    setters[name] = value?.trim() ?? null;
  }

  return ["ok", setters];
}

function parseFlagSetters(text: string):
  | ["ok", string[]]
  | ["error", string] {
  const setters: string[] = [];
  let last = "";
  for (const cur of text) {
    if (!(cur.trim())) { // 空白字符
      if (!last) continue;
      if (last.length === 1) {
        return ["error", "“+” 或 “-” 之后应跟随旗帜名"];
      }
      setters.push(last);
      last = "";
    } else if (cur === "+" || cur === "-") {
      if (last?.length === 1) {
        return ["error", "“+” 或 “-” 之后应跟随旗帜名"];
      } else {
        if (last) {
          setters.push(last);
        }
        last = cur;
      }
    } else if (!last) {
      return ["error", "旗帜设置器应以 “+” 或 “-” 开头"];
    } else {
      last += cur;
    }
  }
  if (last) {
    setters.push(last);
  }
  return ["ok", setters];
}

export function parseNewCards(text: string):
  | ["ok", CardNameWithDescriptionAndOptionalAmount[]]
  | ["error", string] {
  const cards: CardNameWithDescriptionAndOptionalAmount[] = [];

  type S = [symbol: "「" | "『" | "【", n: number]; // “S” 指 “Symbols”
  type A = number | null; // “A” 指 “Amount“
  type State =
    // 一开始，或是结束符号匹配完成：期待「数量」或「卡名」。
    | [t: "$amount|$name"]
    // 数量途中：期待继续的「数量」或标记结束用的 “#”。
    | [t: "$amount|#", a_: string]
    // “#” 后：期待「卡名」。
    | [t: "$name", a: A]
    // 卡名途中：期待「卡名」或「描述的『打开符号』」。
    | [t: "$name|$open", a: A, name_: string]
    // 卡名遇到空白后：期待「描述的『打开符号』」。
    | [t: "$open", a: A, name: string]
    // 打开符号途中：期待继续的「打开符号」或「描述」或「结束符号」。
    | [t: "$open|$desc|$close", a: A, name: string, open_: S]
    // 描述途中：期待继续的「描述」或「结束符号」。
    | [t: "$desc|$close", a: A, name: string, open: S, desc_: string]
    // 结束符号途中：期待继续的「结束符号」。
    | [t: "$close", a: A, name: string, open: S, desc: string, close_: number];
  let state: State = ["$amount|$name"];

  // TODO: 放到更合适的地方。
  // NOTE: 暂时不想转义 “\n” 与其他空白，因为唯一需要转义它们的地方就是卡名了。
  // 为了降低心智负担，卡名杜绝空白。（但仍允许转义描述的打开、关闭符号，因为
  // 即使卡名包含这些符号，由于其他操作是用空白隔开卡名，指定它们时也不用加 “\”。）
  const ESCAPABLE = "「」『』【】#\\";

  function getCharType(char: string, isEscaping: boolean, open: S | null) {
    if (char === "\0") return isEscaping ? "bad_escaped" : "eof";
    if (isEscaping) {
      return ESCAPABLE.indexOf(char) >= 0 ? "normal_escaped" : "bad_escaped";
    }
    if (char === "\\") return "escaping";
    if (/\s/.test(char)) return "space";
    if (/[「『【]/.test(char) && (!open || open[0] === char)) return "open";
    if (/[」』】]/.test(char) && char === getCloseSymbol(open?.[0])) {
      return "close";
    }
    return "normal";
  }
  function getCloseSymbol(openSymbol: string | undefined) {
    return openSymbol && { "「": "」", "『": "』", "【": "】" }[openSymbol];
  }

  function loc() {
    switch (state[0]) {
      case "$amount|$name":
      case "$amount|#":
      case "$name":
      case "$name|$open":
        if (!cards.length) return "起始位置后";
        const name = cards[cards.length - 1].name;
        return `第 ${cards.length} 张卡牌 “${name}” 之后`;
      default:
        return `解析第 ${cards.length + 1} 张卡牌 “${state[2]}” 途中`;
    }
  }

  function errorNotExpected(
    expected: string,
    actual: string,
  ): ["error", string] {
    return ["error", `于${loc()}：期待${expected}，实际遇到${actual}`];
  }

  let nextIsEscaping = false, isEscaping: boolean;
  LOOP:
  for (const cur of text + "\0") {
    [isEscaping, nextIsEscaping] = [nextIsEscaping, false];
    const t = getCharType(cur, isEscaping, state[3] ?? null);
    if (t === "bad_escaped") {
      return [
        "error",
        `于${loc()}：` +
        (cur === "\0"
          ? "“\\” 不能是最后一个字符。"
          : `目前 “\\” 只能用于转义 “${ESCAPABLE}”，其后不能跟随 “${cur}”。`),
      ];
    }
    switch (state[0]) {
      case "$amount|$name": {
        const EXPECTED = "数量或卡名";
        switch (t) {
          case "eof":
            break LOOP;
          case "escaping":
            nextIsEscaping = true;
            continue;
          case "space":
            continue;
          case "normal":
          case "normal_escaped": {
            if (/\d/.test(cur)) {
              state = ["$amount|#", cur];
            } else if (cur === "#" && t !== "normal_escaped") {
              return errorNotExpected(EXPECTED, "“#”");
            } else {
              state = ["$name|$open", null, cur];
            }
            continue;
          }
          case "open":
          case "close":
            return errorNotExpected(EXPECTED, `“${cur}”`);
          default:
            exhaustive(t);
        }
      }

      case "$amount|#": {
        const EXPECTED = "数量的后续或 “#”";
        switch (t) {
          case "eof":
            return errorNotExpected(EXPECTED, "文本结束");
          case "normal":
          case "normal_escaped": {
            if (/\d/.test(cur)) {
              const n: string = state[1] + cur;
              state = ["$amount|#", n];
            } else if (cur === "#") {
              const n: number = Number(state[1]);
              if (n > MAX_SAFE_INTEGER) {
                return ["error", `于${loc()}：数量过大`];
              }
              state = ["$name", n];
            } else { // 如果不是数字也不是 “#”，那代表现在解析到的数字其实是卡名
              state = ["$name|$open", null, state[1] + cur];
            }
            continue;
          }
          case "escaping":
            nextIsEscaping = true;
            state = ["$name|$open", null, state[1]];
            continue;
          case "open":
            state = ["$open|$desc|$close", null, state[1], [cur as S[0], 1]];
            continue;
          case "space":
          case "close":
            return errorNotExpected(EXPECTED, `“${cur}”`);
          default:
            exhaustive(t);
        }
      }

      case "$name":
      case "$name|$open": {
        const EXPECTED = state[0] === "$name"
          ? "卡名"
          : "卡名或包围描述前侧的符号";
        switch (t) {
          case "eof":
            return errorNotExpected(EXPECTED, "文本结束");
          case "escaping":
            nextIsEscaping = true;
            continue;
          case "normal":
          case "normal_escaped": {
            if (cur === "#" && t !== "normal_escaped") {
              return errorNotExpected(EXPECTED, "“#”");
            } else {
              const name: string = state[2] ?? "";
              state = ["$name|$open", state[1], name + cur];
              continue;
            }
          }
          case "open":
            if (state[0] === "$name|$open") {
              const open: S = [cur as S[0], 1];
              state = ["$open|$desc|$close", state[1], state[2], open];
              continue;
            }
          case "space": {
            const name: string = state[2] ?? "";
            state = ["$open", state[1], name];
            continue;
          }
          case "close":
            return errorNotExpected(EXPECTED, `“${cur}”`);
          default:
            exhaustive(t);
        }
      }

      case "$open": {
        const EXPECTED = "包围描述前侧的符号";
        switch (t) {
          case "eof":
            return errorNotExpected(EXPECTED, "文本结束");
          case "escaping":
          case "normal":
          case "normal_escaped":
          case "close":
            return errorNotExpected(EXPECTED, `“${cur}”`);
          case "open": {
            const open: S = [cur as S[0], 1];
            state = ["$open|$desc|$close", state[1], state[2], open];
            continue;
          }
          case "space":
            continue;
          default:
            exhaustive(t);
        }
      }

      case "$open|$desc|$close":
      case "$desc|$close":
      case "$close": {
        const openSym = state[3][0];
        const EXPECTED = (() => {
          switch (state[0]) {
            case "$open|$desc|$close":
              return `“${openSym}”、描述或 “${getCloseSymbol(openSym)!}”`;
            case "$desc|$close":
              return `描述或 “${getCloseSymbol(openSym)!}”`;
            case "$close":
              return `“${getCloseSymbol(openSym)!}”`;
          }
        })();
        switch (t) {
          case "eof":
            return errorNotExpected(EXPECTED, "文本结束");
          case "escaping":
            if (state[0] === "$close") {
              return errorNotExpected(EXPECTED, `“${cur}”`);
            } else {
              nextIsEscaping = true;
              const d: string = state[4] ?? "";
              state = ["$desc|$close", state[1], state[2], state[3], d];
              continue;
            }
          case "space":
          case "normal":
          case "normal_escaped":
            if (state[0] === "$close") {
              return errorNotExpected(EXPECTED, `“${cur}”`);
            } else {
              const d: string = state[4] ?? "";
              state = ["$desc|$close", state[1], state[2], state[3], d + cur];
              continue;
            }
          case "open":
            if (state[0] === "$open|$desc|$close") {
              const open: S = [cur as S[0], state[3][1] + 1];
              state = ["$open|$desc|$close", state[1], state[2], open];
              continue;
            } else { // 比如 “【…【…】”，懒得进行嵌套匹配了。
              return errorNotExpected(EXPECTED, `“${cur}”`);
            }
          case "close":
            const remCloses: number = (state[5] ?? state[3][1]) - 1;
            if (remCloses) {
              const d: string = state[4] ?? "";
              state = ["$close", state[1], state[2], state[3], d, remCloses];
            } else {
              cards.push({
                name: new CardName(state[2]),
                amount: state[1],
                description: state[4]?.trim() ?? "",
              });
              state = ["$amount|$name"];
            }
            continue;
          default:
            exhaustive(t);
        }
      }

      default:
        exhaustive(state[0]);
    }
  }

  return ["ok", cards];
}

function parseCardSpecifiers(
  text: string,
): ["ok", CardNameWithOptionalAmount[]] | ["error", string] {
  const chunks = text.split(/\s+/).filter((c) => c);
  const cards: CardNameWithOptionalAmount[] = [];
  for (const i in chunks) {
    const chunk = chunks[i];
    if (chunk.indexOf("#") >= 0) {
      const g = /(.+?)#(.+)/.exec(chunk);
      if (!g) return ["error", `无法理解第 ${i + 1} 张卡 “${chunk}”`];
      if (g[1] === "全部") {
        cards.push({ name: new CardName(g[2]), amount: "all" });
      } else if (/^\d+$/.test(g[1])) {
        const amount = Number(g[1]);
        if (amount > MAX_SAFE_INTEGER) {
          return ["error", `第 ${i + 1} 张卡指定的数量过大`];
        }
        cards.push({ name: new CardName(g[2]), amount });
      } else {
        return [
          "error",
          `无法理解第 ${i + 1} 指定的数量 ${g[1]}，目前只允许非负整数或 “全部”`,
        ];
      }
    } else {
      cards.push({ name: new CardName(chunk), amount: null });
    }
  }

  return ["ok", cards];
}

/**
 * 将字符串分为 “由第一处并非开头处的空白分割” 的两部分，如果第二部分不存在，第
 * 二部分以 `null` 表示。
 */
function splitByFirstNonLeadingSpaces(text: string): [string, string | null] {
  const g = /(\S+)([\s\S]*)/.exec(text)!;
  if (!g) return ["", null];
  const head = g[1];
  return [head, g[2] || null];
}
