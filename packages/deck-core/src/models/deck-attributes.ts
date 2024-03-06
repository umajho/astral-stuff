import { exhaustive } from "ts-utils";

import { AttributeSetters } from "../commands/types.ts";
import { Deck } from "./decks.ts";
import { DeckInScope, Scope } from "./scopes.ts";

const DECK_ATTRIBUTE_NAMES = ["描述" /*TODO: `, "日志输出群"`*/] as const;
export type DeckAttributeName = (typeof DECK_ATTRIBUTE_NAMES)[number];
const DECK_ATTRIBUTE_DEFAULTS = {
  "描述": "",
} satisfies { [Name in DeckAttributeName]: string };

export class DeckAttributes {
  /**
   * XXX: 如果 Scope 在用替换的方式更新 DeckInScopeData，这里的数据会变得陈旧。
   */
  private readonly deckInScope: DeckInScope;

  constructor(
    private readonly scope: Scope,
    private readonly deck: Deck,
  ) {
    this.deckInScope = this.scope.getDeckByName(this.deck.name)!;
  }

  get 描述Raw(): string | null {
    return this.deckInScope.description;
  }
  get 描述RawWithDefault(): string {
    return this.描述Raw ?? DECK_ATTRIBUTE_DEFAULTS["描述"];
  }
  get 描述(): string {
    return this.描述RawWithDefault;
  }

  update(setters: AttributeSetters): ["ok"] | ["error", string] {
    const unknownNames: string[] = [];
    const deckOptionsInScopeToUpdate: { description?: string | null } = {};
    for (const name in setters) {
      const value = setters[name];
      switch (name) {
        case "描述":
          deckOptionsInScopeToUpdate.description = value;
          break;
        default:
          unknownNames.push(name);
      }
    }

    if (unknownNames.length) {
      return [
        "error",
        ["未知卡组属性名：", unknownNames.join("\n")].join("\n"),
      ];
    }

    if (Object.keys(deckOptionsInScopeToUpdate).length) {
      const result = this.scope.updateDeckOptions(
        this.deck.name,
        deckOptionsInScopeToUpdate,
      );
      if (result[0] !== "ok") return result;
    }

    return ["ok"];
  }

  generateText() {
    return DECK_ATTRIBUTE_NAMES.map((name) => {
      switch (name) {
        case "描述":
          return generateAttributeLine(name, this[`${name}RawWithDefault`], {
            isDefault: this[`${name}Raw`] === null,
          });
        default:
          exhaustive(name);
      }
    }).join("\n");
  }
}

function generateAttributeLine(
  name: string,
  valueRaw: string,
  opts: { isDefault: boolean },
) {
  return (opts.isDefault ? "（默认）" : "") +
    (!!valueRaw ? "" : "（空值）") +
    `${name} ${valueRaw}`;
}
