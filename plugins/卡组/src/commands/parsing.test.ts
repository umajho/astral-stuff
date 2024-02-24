import { describe, expect, it } from "vitest";

import { CardName, DeckName, UserID } from "../ids";
import { COMMAND_EXAMPLES, COMMAND_USAGES, CommandUsage } from "./usages";
import { Command, CommandType, localizeCommandType } from "./types";
import { parseCommand } from "./parsing";

import { generateCommandPrefixEx } from "./test-utils";

const TEST_ROOT_PREFIX = "卡组", TEST_DECK_NAME = new DeckName("某套牌");

const DECIDE_LATER = Symbol("DECIDE_LATER");

const COMMAND_CASES = {
  plugin: {
    "概览": {
      examples: {},
      additionalRawExamples: {
        "": ["ok", { type: "plugin", payload: { type: "概览" } }],
      },
    },
    "帮助": {
      examples: {},
    },
    "列表": {
      examples: {},
    },
    "领域设置": {
      examples: {
        "\n默认卡组 塔罗牌": {
          type: "plugin",
          payload: {
            type: "领域设置",
            attributeSetters: { "默认卡组": "塔罗牌" },
          },
        },
      },
      additionalExamples: {
        "INVALID\nFoo 42": ["error"],
        "": ["ok", {
          type: "plugin",
          payload: { type: "领域设置", attributeSetters: {} },
        }],
        "\nFoo 42\nBar": ["ok", {
          type: "plugin",
          payload: {
            type: "领域设置",
            attributeSetters: { "Foo": "42", "Bar": null },
          },
        }],
        "\nFoo 42\nBar\nFoo": ["error"],
      },
    },
  },
  deck_existence: {
    "创建": {
      examples: {
        "": {
          type: "deck_existence",
          deckName: TEST_DECK_NAME,
          payload: {
            type: "创建",
            flagSetters: [],
            attributeSetters: {},
            cards: [],
            keepsOrderOfCards: false,
          },
        },
        "+不放回": {
          type: "deck_existence",
          deckName: TEST_DECK_NAME,
          payload: {
            type: "创建",
            flagSetters: ["+不放回"],
            attributeSetters: {},
            cards: [],
            keepsOrderOfCards: false,
          },
        },
        "+私聊添加+保密描述": {
          type: "deck_existence",
          deckName: TEST_DECK_NAME,
          payload: {
            type: "创建",
            flagSetters: ["+私聊添加", "+保密描述"],
            attributeSetters: {},
            cards: [],
            keepsOrderOfCards: false,
          },
        },
        "+不放回 +领域默认\n日志输出群 1234567890": {
          type: "deck_existence",
          deckName: TEST_DECK_NAME,
          payload: {
            type: "创建",
            flagSetters: ["+不放回", "+领域默认"],
            attributeSetters: { "日志输出群": "1234567890" },
            cards: [],
            keepsOrderOfCards: false,
          },
        },
        "+放回不独立\n---\n愚者正位「」愚者逆位「」": {
          type: "deck_existence",
          deckName: TEST_DECK_NAME,
          payload: {
            type: "创建",
            flagSetters: ["+放回不独立"],
            attributeSetters: {},
            cards: [
              { name: new CardName("愚者正位"), amount: null, description: "" },
              { name: new CardName("愚者逆位"), amount: null, description: "" },
            ],
            keepsOrderOfCards: false,
          },
        },
        "+放回不独立\n---\n愚者正位「」\n愚者逆位「」": {
          type: "deck_existence",
          deckName: TEST_DECK_NAME,
          payload: {
            type: "创建",
            flagSetters: ["+放回不独立"],
            attributeSetters: {},
            cards: [
              { name: new CardName("愚者正位"), amount: null, description: "" },
              { name: new CardName("愚者逆位"), amount: null, description: "" },
            ],
            keepsOrderOfCards: false,
          },
        },
        "+不放回\n---\n4#一条「上面刻着一只麻雀。」4#白「上面并没有刻字。」": {
          type: "deck_existence",
          deckName: TEST_DECK_NAME,
          payload: {
            type: "创建",
            flagSetters: ["+不放回"],
            attributeSetters: {},
            cards: [
              {
                name: new CardName("一条"),
                amount: 4,
                description: "上面刻着一只麻雀。",
              },
              {
                name: new CardName("白"),
                amount: 4,
                description: "上面并没有刻字。",
              },
            ],
            keepsOrderOfCards: false,
          },
        },
        "+不放回\n---顺序\n1「」2「」3「」4「」5「」": {
          type: "deck_existence",
          deckName: TEST_DECK_NAME,
          payload: {
            type: "创建",
            flagSetters: ["+不放回"],
            attributeSetters: {},
            cards: [
              { name: new CardName("1"), amount: null, description: "" },
              { name: new CardName("2"), amount: null, description: "" },
              { name: new CardName("3"), amount: null, description: "" },
              { name: new CardName("4"), amount: null, description: "" },
              { name: new CardName("5"), amount: null, description: "" },
            ],
            keepsOrderOfCards: true,
          },
        },
      },
      additionalExamples: {
        "\n------\t  顺序  \t\n1「」": ["ok", {
          type: "deck_existence",
          deckName: TEST_DECK_NAME,
          payload: {
            type: "创建",
            flagSetters: [],
            attributeSetters: {},
            cards: [
              { name: new CardName("1"), amount: null, description: "" },
            ],
            keepsOrderOfCards: true,
          },
        }],
        "\n---XXX\n1「」": ["error"],
      },
    },
    "销毁": {
      examples: {},
    },
    "导出": {
      examples: {},
    },
    "导入": {
      suffixPayloadPatches: {
        "创建": { mode: "create" },
        "覆盖": { mode: "overwrite" },
      },
      examples: {
        "Il9fRVhBTVBMRV9fIg==": {
          type: "deck_existence",
          deckName: TEST_DECK_NAME,
          payload: {
            type: "导入",
            // @ts-ignore 根据变体决定。
            mode: DECIDE_LATER,
            data: "__EXAMPLE__",
          },
        },
      },
    },
  },
  deck: {
    "概览": {
      examples: {},
      additionalRawExamples: {
        [`：${TEST_DECK_NAME}`]: ["ok", {
          type: "deck",
          deckName: TEST_DECK_NAME,
          payload: { type: "概览" },
        }],
      },
    },
    "列表": {
      examples: {},
    },
    "查看": {
      examples: {
        "愚者正位 世界逆位": {
          type: "deck",
          deckName: TEST_DECK_NAME,
          payload: {
            type: "查看",
            cards: [new CardName("愚者正位"), new CardName("世界逆位")],
          },
        },
      },
    },
    "设置": {
      examples: {
        "+闸停-保密描述": {
          type: "deck",
          deckName: TEST_DECK_NAME,
          payload: {
            type: "设置",
            flagSetters: ["+闸停", "-保密描述"],
            attributeSetters: {},
          },
        },
        "\n日志输出群 1234567890": {
          type: "deck",
          deckName: TEST_DECK_NAME,
          payload: {
            type: "设置",
            flagSetters: [],
            attributeSetters: { "日志输出群": "1234567890" },
          },
        },
        "+闸停-保密描述\n日志输出群 1234567890": {
          type: "deck",
          deckName: TEST_DECK_NAME,
          payload: {
            type: "设置",
            flagSetters: ["+闸停", "-保密描述"],
            attributeSetters: { "日志输出群": "1234567890" },
          },
        },
      },
    },
    "添加": {
      suffixPayloadPatches: {
        "": { at: null },
        "于顶部": { at: "top" },
        "于底部": { at: "bottom" },
      },
      examples: {
        "愚者正位「」愚者逆位「」": {
          type: "deck",
          deckName: TEST_DECK_NAME,
          payload: {
            type: "添加",
            // @ts-ignore 根据变体决定。
            at: DECIDE_LATER,
            cards: [
              { name: new CardName("愚者正位"), amount: null, description: "" },
              { name: new CardName("愚者逆位"), amount: null, description: "" },
            ],
          },
        },
        "\n愚者正位「」\n愚者逆位「」": {
          type: "deck",
          deckName: TEST_DECK_NAME,
          payload: {
            type: "添加",
            // @ts-ignore 根据变体决定。
            at: DECIDE_LATER,
            cards: [
              { name: new CardName("愚者正位"), amount: null, description: "" },
              { name: new CardName("愚者逆位"), amount: null, description: "" },
            ],
          },
        },
        "4#一条「上面刻着一只麻雀。」4#白「上面并没有刻字。」": {
          type: "deck",
          deckName: TEST_DECK_NAME,
          payload: {
            type: "添加",
            // @ts-ignore 根据变体决定。
            at: DECIDE_LATER,
            cards: [
              {
                name: new CardName("一条"),
                amount: 4,
                description: "上面刻着一只麻雀。",
              },
              {
                name: new CardName("白"),
                amount: 4,
                description: "上面并没有刻字。",
              },
            ],
          },
        },
      },
    },
    "删除": {
      examples: {
        "全部#要全都删的卡牌 只要删一张的卡牌 3#要删三张的卡牌": {
          type: "deck",
          deckName: TEST_DECK_NAME,
          payload: {
            type: "删除",
            cards: [
              { name: new CardName("要全都删的卡牌"), amount: "all" },
              { name: new CardName("只要删一张的卡牌"), amount: null },
              { name: new CardName("要删三张的卡牌"), amount: 3 },
            ],
          },
        },
      },
    },
    "洗牌": {
      examples: {},
    },
    "回收全部并洗牌": {
      examples: {},
    },
    "抽卡": {
      suffixPayloadPatches: {
        "": { to: "currentPlace" },
        "至私聊": { to: "senderPrivate" },
      },
      examples: {
        "": {
          type: "deck",
          deckName: TEST_DECK_NAME,
          payload: {
            type: "抽卡",
            // @ts-ignore
            to: DECIDE_LATER,
            amount: null,
          },
        },
        "3": {
          type: "deck",
          deckName: TEST_DECK_NAME,
          payload: {
            type: "抽卡",
            // @ts-ignore
            to: DECIDE_LATER,
            amount: 3,
          },
        },
      },
    },
    "窥视": {
      suffixPayloadPatches: {
        "": { to: "currentPlace" },
        "至私聊": { to: "senderPrivate" },
      },
      examples: {
        "": {
          type: "deck",
          deckName: TEST_DECK_NAME,
          payload: {
            type: "窥视",
            // @ts-ignore
            to: DECIDE_LATER,
            amount: null,
          },
        },
        "3": {
          type: "deck",
          deckName: TEST_DECK_NAME,
          payload: {
            type: "窥视",
            // @ts-ignore
            to: DECIDE_LATER,
            amount: 3,
          },
        },
      },
    },
  },
  deck_discard_pile: {
    "列表": {
      examples: {},
    },
    "回收": {
      suffixPayloadPatches: {
        "": { at: null },
        "于顶部": { at: "top" },
        "于底部": { at: "bottom" },
      },
      examples: {
        "召唤魔术": {
          type: "deck_discard_pile",
          deckName: TEST_DECK_NAME,
          payload: {
            type: "回收",
            // @ts-ignore
            at: DECIDE_LATER,
            cards: [{ name: new CardName("召唤魔术"), amount: null }],
          },
        },
      },
    },
    "回收全部并洗牌": {
      examples: {},
    },
    "删除全部": {
      examples: {},
    },
  },
  deck_hand: {
    "列表": {
      examples: {},
    },
    "加入": {
      examples: {
        "闪亮登场": {
          type: "deck_hand",
          deckName: TEST_DECK_NAME,
          userID: null,
          payload: {
            type: "加入",
            cards: [{ name: new CardName("闪亮登场"), amount: null }],
          },
        },
      },
    },
    "丢弃": {
      examples: {
        "某某某": {
          type: "deck_hand",
          deckName: TEST_DECK_NAME,
          userID: null,
          payload: {
            type: "丢弃",
            cards: [{ name: new CardName("某某某"), amount: null }],
          },
        },
      },
    },
    "丢弃全部": {
      examples: {},
    },
    "回收": {
      suffixPayloadPatches: {
        "": { at: null },
        "于顶部": { at: "top" },
        "于底部": { at: "bottom" },
      },
      examples: {
        "某某某": {
          type: "deck_hand",
          deckName: TEST_DECK_NAME,
          userID: null,
          payload: {
            type: "回收",
            // @ts-ignore
            at: DECIDE_LATER,
            cards: [{ name: new CardName("某某某"), amount: null }],
          },
        },
      },
    },
    "回收全部并洗牌": {
      examples: {},
    },
    "转让至": {
      examples: {
        "9876543210 某某某": {
          type: "deck_hand",
          deckName: TEST_DECK_NAME,
          userID: null,
          payload: {
            type: "转让至",
            receiverID: new UserID("9876543210"),
            cards: [{ name: new CardName("某某某"), amount: null }],
          },
        },
      },
    },
  },
  between_decks: {
    "克隆为": {
      examples: {
        "第二副牌": {
          type: "between_decks",
          subjectDeckName: TEST_DECK_NAME,
          objectDeckName: new DeckName("第二副牌"),
          payload: { type: "克隆为" },
        },
      },
    },
    "全部添加至": {
      examples: {
        "另一副牌": {
          type: "between_decks",
          subjectDeckName: TEST_DECK_NAME,
          objectDeckName: new DeckName("另一副牌"),
          payload: { type: "全部添加至" },
        },
      },
    },
    "重命名为": {
      examples: {
        "新名字": {
          type: "between_decks",
          subjectDeckName: TEST_DECK_NAME,
          objectDeckName: new DeckName("新名字"),
          payload: { type: "重命名为" },
        },
      },
    },
    "挑选添加至": {
      examples: {
        "另一副牌 全部#某某某": {
          type: "between_decks",
          subjectDeckName: TEST_DECK_NAME,
          objectDeckName: new DeckName("另一副牌"),
          payload: {
            type: "挑选添加至",
            cards: [{ name: new CardName("某某某"), amount: "all" }],
          },
        },
      },
    },
    "挑选转移至": {
      examples: {
        "另一副牌 全部#某某某": {
          type: "between_decks",
          subjectDeckName: TEST_DECK_NAME,
          objectDeckName: new DeckName("另一副牌"),
          payload: {
            type: "挑选转移至",
            cards: [{ name: new CardName("某某某"), amount: "all" }],
          },
        },
      },
    },
  },
} as const satisfies {
  [Type in CommandType]: {
    [Name in keyof (typeof COMMAND_USAGES)[Type]]: {
      // TODO: 更好的类型
      suffixPayloadPatches?: { [suffix: string]: any };
      examples: {
        // @ts-ignore 虽然报错，但是能给出补全…
        [Example in (typeof COMMAND_EXAMPLES)[Type][Name][number]]: Command;
      };
      additionalExamples?: { [input: string]: ["ok", Command] | ["error"] };
      additionalRawExamples?: { [input: string]: ["ok", Command] | ["error"] };
    };
  };
};

describe.todo("各前缀", () => {
});

describe("各命令", () => {
  for (const typ of Object.keys(COMMAND_USAGES)) {
    testCommandsInSingleUsageType(typ as CommandType);
  }
  function testCommandsInSingleUsageType(typ: CommandType) {
    describe(`类型「${localizeCommandType(typ)}」`, () => {
      for (const [name, usage] of Object.entries(COMMAND_USAGES[typ])) {
        describe(`命令「${name}」`, () => testCommand(typ, name, usage));
      }
    });
  }
  function testCommand(typ: CommandType, name: string, usage: CommandUsage) {
    const examples = COMMAND_EXAMPLES[typ][name] as string[];
    if (usage.suffixes?.length) {
      for (const suffix of usage.suffixes) {
        describe(suffix ? `后缀「${suffix}」` : "无后缀", () => {
          testCommandVariant(typ, name, suffix, usage, examples);
        });
      }
    } else {
      testCommandVariant(typ, name, "", usage, examples);
    }
  }
  function testCommandVariant(
    typ: CommandType,
    name: string,
    suffix: string,
    usage: CommandUsage,
    examples: string[],
  ) {
    const prefix = generateCommandPrefixEx(usage.prefixType, {
      rootPrefix: null,
      deckName: TEST_DECK_NAME,
      handOwner: null,
    });
    const variantName = name + suffix;

    if (!usage.argumentsFormat) {
      describe("无参数", () => {
        it("不带参数时正常", () => {
          for (
            const input of [
              // "deck_hand" 的前缀最后是用户 ID，需要和命令名用空白隔开。
              `${prefix}${variantName}`,
              `${prefix} ${variantName}`,
              `${prefix} ${variantName} `,
            ]
          ) {
            const parseOpts = { rootPrefix: TEST_ROOT_PREFIX };
            const result = parseCommand(input, parseOpts);
            expect(result[0]).toBe("ok");
            const cmd = (result as Extract<typeof result, { 0: "ok" }>)[1];
            expect(cmd.type).toBe(typ);
            if (name === variantName) {
              // 在不是变体的情况下，没有参数的命令应该只含命令名。
              expect(Object.keys(cmd.payload).length).toBe(1);
              expect(cmd.payload.type).toBe(name);
            }
          }
        });
        it("带参数时返回错误", () => {
          const input = `${prefix}${variantName} XXX`;
          const parseOpts = { rootPrefix: TEST_ROOT_PREFIX };
          const result = parseCommand(input, parseOpts);
          expect(result[0]).toBe("error");
        });
      });
    }

    const cases: { // TODO: 应该有更可靠的方法决定类型。
      examples: { [example: string]: Command };
      suffixPayloadPatches?: { [suffix: string]: any };
      additionalExamples?: { [input: string]: ["ok", Command] | ["error"] };
      additionalRawExamples?: { [input: string]: ["ok", Command] | ["error"] };
    } = COMMAND_CASES[typ][name];

    function makeExpected(raw: Command, suffix: string): Command {
      return {
        ...raw,
        payload: {
          ...raw.payload,
          ...cases.suffixPayloadPatches?.[suffix],
        },
      };
    }

    if (examples.length) {
      describe("示例", () => {
        for (const [i, example] of examples.entries()) {
          it(`case ${i + 1}: “${example}”`, () => {
            const expected = makeExpected(cases.examples[example]!, suffix);
            const input = `${prefix}${variantName} ${example}`;
            const parseOpts = { rootPrefix: TEST_ROOT_PREFIX };
            const result = parseCommand(input, parseOpts);
            expect(result).toEqual(["ok", expected]);
          });
        }
      });
    }
    if (!suffix) { // 考虑到把各种后缀变体都测试一遍意义不大，就只测试无后缀的情况了。
      if (cases.additionalExamples) {
        describe("补充示例", () => {
          for (
            const [i, [example, rawExpected]] of //
            Object.entries(cases.additionalExamples!).entries()
          ) {
            it(`case ${i + 1}: “${example}”`, () => {
              const expected: typeof rawExpected = rawExpected[0] === "ok"
                ? ["ok", makeExpected(rawExpected[1], "")]
                : rawExpected;
              const input = `${prefix}${variantName} ${example}`;
              const parseOpts = { rootPrefix: TEST_ROOT_PREFIX };
              const result = parseCommand(input, parseOpts);
              if (expected[0] === "ok") {
                expect(result).toEqual(["ok", expected[1]]);
              } else {
                expect(result[0]).toBe("error");
              }
            });
          }
        });
      }
      if (cases.additionalRawExamples) {
        describe("补充原生示例", () => {
          for (
            const [i, [example, rawExpected]] of //
            Object.entries(cases.additionalRawExamples!).entries()
          ) {
            it(`case ${i + 1}: “${example}”`, () => {
              const expected: typeof rawExpected = rawExpected[0] === "ok"
                ? ["ok", makeExpected(rawExpected[1], "")]
                : rawExpected;
              const parseOpts = { rootPrefix: TEST_ROOT_PREFIX };
              const result = parseCommand(example, parseOpts);
              if (expected[0] === "ok") {
                expect(result).toEqual(["ok", expected[1]]);
              } else {
                expect(result[0]).toBe("error");
              }
            });
          }
        });
      }
    }
  }
});
