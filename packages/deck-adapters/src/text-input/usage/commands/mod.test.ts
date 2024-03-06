import { describe, expect, it } from "vitest";

import { CommandPrefixType } from "../../parsing/types";

import { CommandUsage, generateCommandUsageText } from "./mod";

describe("generateCommandUsageText", () => {
  it("可以处理简单的用法", () => {
    expect(generateCommandUsageTextForTest()).toBe("“根前缀命令”\n　　…描述…");
  });

  describe("前缀类型", () => {
    const table: { [Type in CommandPrefixType]: string } = {
      "global": "“根前缀命令”\n　　…描述…",
      "deck": "“根前缀：<卡组名> 命令”\n　　…描述…",
      "deck_discard_pile": "“根前缀：<卡组名> 弃牌堆命令”\n　　…描述…",
      "deck_hand": "“根前缀：<卡组名> 手牌(：<@所属者> )?命令”\n　　…描述…",
    };

    for (const [i, [t, result]] of Object.entries(table).entries()) {
      it(`case ${i + 1}: ${t}`, () => {
        expect(
          generateCommandUsageTextForTest({
            prefixType: t as CommandPrefixType,
          }),
        ).toBe(result);
      });
    }
  });

  it("可以处理复杂的用法", () => {
    expect(generateCommandUsageTextForTest({
      suffixes: ["", "后缀变体"],
      argumentsFormat: "<参数格式>",
    }, { examples: ["示例1", "示例2"] })).toBe([
      "“根前缀命令(后缀变体)? <参数格式>”",
      "　　…描述…",
      "示例：",
      "　　根前缀命令 示例1",
      "　　根前缀命令 示例2",
    ].join("\n"));
  });

  it("可以处理文本替代", () => {
    expect(generateCommandUsageTextForTest({
      argumentsFormat: "\n{/}\n",
      description: "{/}\n{.}",
    }, { examples: ["{/}\n{/}{.}"] })).toBe([
      "“根前缀命令 <换行>根前缀<换行>”",
      "　　根前缀",
      "　　命令",
      "示例：",
      "　　根前缀命令 根前缀<换行>根前缀命令",
    ].join("\n"));
  });

  it("会将第一个后缀变体加到示例中", () => {
    expect(generateCommandUsageTextForTest({
      suffixes: ["XXX", "YYY"],
      argumentsFormat: "<参数格式>",
    }, { examples: ["{/}\n{/}{.}"] })).toBe([
      "“根前缀命令(XXX|YYY) <参数格式>”",
      "　　…描述…",
      "示例：",
      "　　根前缀命令XXX 根前缀<换行>根前缀命令",
    ].join("\n"));
  });
});

function generateCommandUsageTextForTest(
  usage?: Partial<CommandUsage>,
  opts?: { examples?: string[] },
): string {
  return generateCommandUsageText(
    "命令",
    {
      prefixType: "global",
      description: "…描述…",
      ...usage,
    },
    opts?.examples ?? [],
    { rootPrefix: "根前缀" },
  );
}
