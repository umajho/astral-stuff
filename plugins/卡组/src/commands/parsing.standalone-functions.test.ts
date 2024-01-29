import { describe, expect, it } from "vitest";

import { CardName } from "../ids";
import { CardNameWithDescriptionAndOptionalAmount } from "./types";
import { parseNewCards } from "./parsing";

describe("单独的解析函数", () => {
  describe("parseNewCards", () => {
    const table: [
      string | string[],
      ["ok", CardNameWithDescriptionAndOptionalAmount[]] | ["error"],
    ][] = [
      [ // 包围描述的符号种类；卡名前后、描述的空白。
        ["FOO「」", "FOO【】", "FOO『』", "\tFOO\n「\n」"],
        ["ok", [{ name: new CardName("FOO"), description: "", amount: null }]],
      ],
      // 必须带描述。
      ["FOO", ["error"]],
      // 卡名不能带空白。
      [["FO O「」", "FO\nO「」"], ["error"]],
      [ // 描述前后的空白会被删去。
        ["FOO「foo」", "FOO「\nfoo\n」"],
        ["ok", [
          { name: new CardName("FOO"), description: "foo", amount: null },
        ]],
      ],
      [ // 描述中的空白保留。
        "FOO「f\no\nto」",
        ["ok", [
          { name: new CardName("FOO"), description: "f\no\nto", amount: null },
        ]],
      ],
      [ // 多个相同符号包围描述。
        ["FOO「【foo】」", "FOO「「「【foo】」」」"],
        ["ok", [
          { name: new CardName("FOO"), description: "【foo】", amount: null },
        ]],
      ],
      // 如果没有转义，包围描述的符号不能出现在描述里。
      [["FOO「【「】」", "FOO「【「」】」"], ["error"]],
      [ // 可以通过转义让包围描述的符号出现在描述里。
        "FOO「\\「」",
        ["ok", [
          { name: new CardName("FOO"), description: "「", amount: null },
        ]],
      ],
      [ // 同上。
        "FOO「【\\「】」",
        ["ok", [
          { name: new CardName("FOO"), description: "【「】", amount: null },
        ]],
      ],
      [ // 同上。
        "FOO「\\」」",
        ["ok", [
          { name: new CardName("FOO"), description: "」", amount: null },
        ]],
      ],
      [ // 可以通过转义让包围描述的符号作为卡名的一部分。
        "\\「「」",
        ["ok", [
          { name: new CardName("「"), description: "", amount: null },
        ]],
      ],
      [ // 可以通过转义让 “#” 作为卡名的一部分。
        "\\#「」",
        ["ok", [
          { name: new CardName("#"), description: "", amount: null },
        ]],
      ],
      // “#” 不能直接当卡名。
      ["#「」", ["error"]],
      [ // 同上
        "123\\#「」",
        ["ok", [
          { name: new CardName("123#"), description: "", amount: null },
        ]],
      ],
      [ // 卡名前指定数量，同样的写法在描述中不生效。
        "3#FOO「3#」",
        ["ok", [
          { name: new CardName("FOO"), description: "3#", amount: 3 },
        ]],
      ],
      [ // 没有 “#” 时卡名也可以以阿拉伯数字开始。
        "3「3#」",
        ["ok", [
          { name: new CardName("3"), description: "3#", amount: null },
        ]],
      ],
      [ // 同上。
        "3FO3O「3#」",
        ["ok", [
          { name: new CardName("3FO3O"), description: "3#", amount: null },
        ]],
      ],
      [ // 多张卡。
        ["FOO「」BAR「」", "FOO「」\nBAR「」\t"],
        ["ok", [
          { name: new CardName("FOO"), description: "", amount: null },
          { name: new CardName("BAR"), description: "", amount: null },
        ]],
      ],
      [ // 多张卡 EX。
        "FOO「」\nBAR「bar」\t3#BAZ【】",
        ["ok", [
          { name: new CardName("FOO"), description: "", amount: null },
          { name: new CardName("BAR"), description: "bar", amount: null },
          { name: new CardName("BAZ"), description: "", amount: 3 },
        ]],
      ],
    ];

    for (const [i, [inputs, expected]] of table.entries()) {
      function doTest(input: string) {
        const result = parseNewCards(input);
        if (expected[0] === "ok") {
          expect(result[1]).toEqual(expected[1]);
        } else {
          expect(result[0]).toBe("error");
        }
      }
      if (Array.isArray(inputs)) {
        for (const [j, input] of inputs.entries()) {
          it(`case ${i + 1}.${j + 1}: (${expected[0]}) ${input}`, () => {
            doTest(input);
          });
        }
      } else {
        const input = inputs;
        it(`case ${i + 1}: (${expected[0]}) ${input}`, () => {
          doTest(input);
        });
      }
    }
  });
});
