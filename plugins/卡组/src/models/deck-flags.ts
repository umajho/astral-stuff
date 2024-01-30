import { DeckName } from "../ids.ts";

const PUT_BACK_MODES = ["放回", "不放回", "放回不重复", "放回不独立"] as const;
export type PutBackMode = (typeof PUT_BACK_MODES)[number];
const DISCARD_FLAGS = ["弃牌区" /*TODO!!: , "手牌" */] as const;
export type DiscardFlag = (typeof DISCARD_FLAGS)[number];
export type DiscardFlags = { [Name in DiscardFlag]?: boolean };
const DECK_FLAG_NAMES = [
  ...PUT_BACK_MODES,
  ...DISCARD_FLAGS,
  //TODO!!: ...["私聊添加", "保密"],
  //TODO!!: ...["冻结", "模板", "收卡", "闸停"],
  "领域默认",
] as const;
export type FlagName = (typeof DECK_FLAG_NAMES)[number];

export function updateDeckFlags(
  oldFlags: FlagName[],
  flagSetters: string[],
): ["ok", FlagName[]] | ["error", string] {
  const oldPutBackMode = extractPutBackMode(oldFlags);
  const oldDiscardFlags = extractDiscardFlags(oldFlags);
  const oldIsScopeDefault = oldFlags.indexOf("领域默认") >= 0;

  let newPutBackMode: PutBackMode | "unset" | undefined;
  let newDiscardFlags: DiscardFlags = {};
  let newIsScopeDefault: boolean | undefined;
  for (const setter of flagSetters) {
    if (!/^[+-]/.test(setter)) {
      return ["error", "旗帜设置器应以 “+” 或 “-” 开头"];
    }
    const toSet = setter[0] === "+";
    const flag = setter.slice(1);
    if ((PUT_BACK_MODES as readonly string[]).indexOf(flag) >= 0) {
      // 放回模式
      if (toSet) {
        if (!newPutBackMode || newPutBackMode === "unset") {
          newPutBackMode = flag as PutBackMode;
        } else if (newPutBackMode !== flag) {
          // 刚 “+” 了一种放回模式，然后又 “+” 了一种不同的
          return ["error", `不能同时启用旗帜 “${newPutBackMode}” 与 ${flag}`];
        }
      } else if ((newPutBackMode ?? oldPutBackMode) === flag) {
        newPutBackMode = "unset";
      }
    } else if ((DISCARD_FLAGS as readonly string[]).indexOf(flag) >= 0) {
      newDiscardFlags[flag as DiscardFlag] = toSet;
    } else if (flag === "领域默认") {
      newIsScopeDefault = toSet;
    } else {
      return ["error", `未知旗帜 ${flag}`];
    }
  }

  if (newPutBackMode === "unset") {
    const modes = PUT_BACK_MODES.map((m) => `“${m}”`).join("、");
    return ["error", `必须要启用一个放回相关的旗帜（${modes}）有效`];
  }
  const finalPutBackMode = newPutBackMode ?? oldPutBackMode;
  if (finalPutBackMode === "不放回" && !("弃牌区" in newDiscardFlags)) {
    // 如果没有明确不启用弃牌区，那么弃牌区默认开启。
    newDiscardFlags["弃牌区"] = true;
  }

  const finalFlags: FlagName[] = [finalPutBackMode];
  if (finalPutBackMode === "不放回") {
    if (newDiscardFlags["弃牌区"] ?? oldDiscardFlags["弃牌区"]) {
      finalFlags.push("弃牌区");
    }
  } else {
    for (const name of DISCARD_FLAGS) {
      if (newDiscardFlags[name]) {
        return ["error", `只有启用旗帜 “不放回” 时可以启用 旗帜 “${name}”`];
      }
    }
  }
  if (newIsScopeDefault ?? oldIsScopeDefault) {
    finalFlags.push("领域默认");
  }

  return ["ok", finalFlags];
}

export function generateDeckFlagsText(
  flags: FlagName[],
  opts: { deckName: DeckName },
): string {
  const putBackMode = extractPutBackMode(flags);
  const discardFlags = extractDiscardFlags(flags);

  let texts: string[] = [];

  {
    const indicators: string[] = [];
    for (const mode of [...PUT_BACK_MODES]) {
      if (mode === putBackMode) {
        indicators.splice(0, 0, "+" + mode);
      } else {
        indicators.push("-" + mode);
      }
    }
    const description = (() => {
      switch (putBackMode) {
        case "放回":
          return "每抽一张卡，将抽到的卡放回卡组去。";
        case "不放回":
          return "每抽一张卡，不将抽到的卡放回卡组。（具体效果见其他旗帜。）";
        case "放回不重复":
          return "抽多张卡时，忽略这期间已经抽到过的卡，直到抽够不同种类的指定数量的卡为止。";
        case "放回不独立":
          return "抽多张卡时，直到抽到指定数量的卡后再一次性将抽到的所有卡放回卡组。";
      }
    })();
    texts.push(indicators.join("") + "\n" + description);
  }

  {
    const indicators: string[] = [];
    for (const name of DISCARD_FLAGS) {
      indicators.push((discardFlags[name] ? "+" : "-") + name);
    }
    const description = (() => {
      if (putBackMode === "不放回") {
        if (discardFlags.弃牌区) {
          return "抽到的卡放入弃牌区。";
        } else {
          return "抽到的卡直接删除。";
        }
      } else {
        return "这套旗帜只在启用旗帜 “不放回” 时有效。";
      }
    })();
    texts.push(indicators.join("") + "\n" + description);
  }

  {
    if (flags.indexOf("领域默认") >= 0) {
      const usage =
        `形如 “卡组：${opts.deckName.deckName} 抽卡” 的命令形式可以简化为 “：抽卡”`;
      texts.push([
        "+领域默认",
        `本套卡组是本领域的默认卡组，${usage}。`,
      ].join("\n"));
    } else {
      texts.push([
        "-领域默认",
        "本套卡组不是本领域的默认卡组，因此需要使用完整的命令形式。",
      ].join("\n"));
    }
  }

  return texts.join("\n\n");
}

export function extractPutBackMode(flags: FlagName[]): PutBackMode {
  for (let i = flags.length - 1; i >= 0; i--) {
    if ((PUT_BACK_MODES as readonly string[]).indexOf(flags[i]) >= 0) {
      return flags[i] as PutBackMode;
    }
  }
  return "放回";
}

// TODO!: 值的类型不应该含 “undefined”。
export function extractDiscardFlags(flags: FlagName[]): DiscardFlags {
  const discardFlags: DiscardFlags = {};
  if (flags.indexOf("弃牌区") >= 0) {
    discardFlags["弃牌区"] = true;
  }
  return discardFlags;
}
