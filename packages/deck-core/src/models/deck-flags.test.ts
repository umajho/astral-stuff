import { describe, expect, it } from "vitest";

import { FlagName, updateDeckFlags } from "./deck-flags";

describe("updateDeckFlags", () => {
  const table: [
    input: [oldFlags: FlagName[], setters: string[]],
    expected: ["ok", FlagName[]] | ["error"],
  ][] = [
    // fallback：
    [[[], []], ["ok", ["放回"]]],
    // 旗帜设置器有误：
    [[[], ["BAD"]], ["error"]],
    // 一般情况：
    [[["放回"], []], ["ok", ["放回"]]],
    [[["放回不独立"], []], ["ok", ["放回不独立"]]],
    [[["不放回"], []], ["ok", ["不放回", "弃牌堆"]]],
    [[["不放回"], ["-弃牌堆"]], ["ok", ["不放回"]]],
    // 转换放回模式：
    [[["放回"], ["+不放回"]], ["ok", ["不放回", "弃牌堆"]]],
    [[["放回"], ["-弃牌堆", "+不放回"]], ["ok", ["不放回"]]],
    // “不放回” 之外不能启用弃牌相关旗帜：
    [[["放回"], ["+弃牌堆"]], ["error"]],
    // 去掉无关的旗帜没有影响：
    [[["放回"], ["-弃牌堆", "-不放回"]], ["ok", ["放回"]]],
    // 放回模式至少要且仅能启用一个：
    [[["放回"], ["-放回"]], ["error"]],
    [[["放回"], ["+放回"]], ["ok", ["放回"]]],
    [[["放回"], ["+放回", "+不放回"]], ["error"]],
    [[["放回"], ["+放回不重复", "-放回"]], ["ok", ["放回不重复"]]], // “-放回” 被忽略。
    [[["放回"], ["-放回", "+放回不重复"]], ["ok", ["放回不重复"]]],
    // 领域默认：
    [[["放回"], ["+领域默认"]], ["ok", ["放回", "领域默认"]]],
    [[["不放回", "领域默认"], ["+放回"]], ["ok", ["放回", "领域默认"]]],
    [[["放回", "领域默认"], ["-领域默认"]], ["ok", ["放回"]]],
  ];

  for (const [i, [[inputOld, inputSetters], expected]] of table.entries()) {
    const inputText = `${JSON.stringify(inputOld)} + ${
      JSON.stringify(inputSetters)
    }`;
    const expectedText = expected[0] === "ok"
      ? " => " + JSON.stringify(expected[1])
      : "";
    it(`case ${i}: (${expected[0]}) ${inputText}` + expectedText, () => {
      const result = updateDeckFlags(inputOld, inputSetters);
      if (expected[0] === "ok") {
        expect(result[1]).toEqual(expected[1]);
      } else {
        expect(result[0]).toBe("error");
      }
    });
  }
});
