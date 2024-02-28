import {
  AttributeSetters,
  CardNameWithDescriptionAndOptionalAmount,
  CardNameWithOptionalAmount,
} from "../commands/types.ts";
import { CardName, DeckName, ScopeID, UserID } from "../ids.ts";
import { randomInt, shuffle } from "../js-utils.ts";
import { exhaustive } from "../ts-utils.ts";
import {
  DeckAttributeName,
  DeckAttributes,
  generateDeckAttributesText,
} from "./deck-attributes.ts";
import {
  DiscardFlags,
  extractDiscardFlags,
  extractPutBackMode,
  FlagName,
  generateDeckFlagsText,
  PutBackMode,
  updateDeckFlags,
} from "./deck-flags.ts";
import { Scope } from "./scopes.ts";

export interface CardData {
  name: string;
  description: string;
  providerID: string;
}

export class Card {
  constructor(
    public readonly name: CardName,
    public readonly description: string,
    public readonly providerID: UserID,
  ) {}

  generateShortText(opts?: { amount?: number }): string {
    let description = this.description.length >= 10
      ? this.description.slice(0, 9) + "…"
      : this.description;
    description = description.replace(/\n/g, "<换行>");
    return (opts?.amount !== undefined ? `${opts.amount}#` : "") +
      `${this.name}：${description}`;
  }

  generateFullText(): string {
    const isMultiLines = this.description.indexOf("\n") >= 0;
    return [
      "添加者：" + this.providerID,
      `${this.name}「${isMultiLines ? "\n" : ""}${this.description}」`,
    ].join("\n");
  }
}

export interface DeckData {
  mainOwner: string;
  attributes: DeckAttributes;
  flags: Exclude<FlagName, "领域默认">[];
  cards: {
    [name: string]: {
      referenceCount: number;
      description: string;
      providerID: string;
    };
  };

  // 索引 0 是底部。
  drawPile: string[];
  discardPile: string[];
  hands: {}; //TODO!
  customPiles: {}; //TODO!
}

export function makeNewDeckData(mainOwner: UserID): DeckData {
  return {
    mainOwner: mainOwner.userID,
    attributes: {},
    flags: ["放回"],
    cards: {},
    drawPile: [],
    discardPile: [],
    hands: {},
    customPiles: {},
  };
}

export class Deck {
  constructor(
    public readonly name: DeckName,
    private readonly data: DeckData,
    private readonly scope: Scope,
  ) {}

  get scopeID(): ScopeID {
    return this.scope.name;
  }

  asData(): DeckData {
    return this.data;
  }

  get mainOwner(): UserID {
    return new UserID(this.data.mainOwner);
  }

  get totalCardKinds(): number {
    return Object.keys(this.data.cards).length;
  }

  get totalCards(): number {
    let n = 0;
    for (const name in this.data.cards) {
      n += this.data.cards[name].referenceCount;
    }
    return n;
  }

  generateSummaryText(): string {
    return [
      `= 卡组 “${this.name}” =`,
      ...(this.attributes.描述 ? [this.attributes.描述] : []),
      "主拥有者：" + this.mainOwner,
      "卡牌种类数：" + this.totalCardKinds,
      "卡牌总数：" + this.totalCards,
      "",
      "== 旗帜 ==",
      "",
      generateDeckFlagsText(this.fullFlags, {
        deckName: this.name,
      }),
      "",
      "== 属性 ==",
      "",
      generateDeckAttributesText(this.attributes),
    ].join("\n");
  }

  get putBackMode(): PutBackMode {
    return extractPutBackMode(this.data.flags);
  }

  get discardFlags(): DiscardFlags {
    return extractDiscardFlags(this.data.flags);
  }

  get flag领域默认(): boolean {
    return this.scope.attr默认卡组?.equals(this.name) ?? false;
  }

  get fullFlags(): FlagName[] {
    if (this.flag领域默认) {
      return [...this.data.flags, "领域默认"];
    } else {
      return this.data.flags;
    }
  }

  updateFlags(
    flagSetters: string[],
    senderID: UserID,
  ): ["ok"] | ["error", string] {
    const result = updateDeckFlags(this.fullFlags, flagSetters);
    if (result[0] === "error") return result;

    const flags = result[1];
    if (flags.indexOf("领域默认") >= 0) {
      const result = this.scope //
        .setAttributeTextInternal("默认卡组", "" + this.name, senderID);
      if (result[0] === "error") return result;
    }
    this.data.flags = //
      flags.filter((f) => f !== "领域默认") as typeof this.data.flags;

    if (this.putBackMode !== "不放回") {
      // TODO!!: 应该交给卡组级别的 “回收全部”（`recycleAll`），但现在还没实现它。
      const result = this.recycleAllCardsDiscardPile();
      if (result[0] !== "ok") {
        return ["error", "? recycleDiscardPile in updateFlags"];
      }
    }

    return ["ok"];
  }

  get attributes(): DeckAttributes {
    return this.data.attributes;
  }

  updateAttributes(
    attributeSetters: AttributeSetters,
    senderID: UserID,
  ): ["ok"] | ["error", string] {
    const unknownNames: string[] = [];
    for (const name in attributeSetters) {
      const value = attributeSetters[name];
      switch (name) {
        case "描述":
          if (value !== null) {
            this.data.attributes["描述"] = value;
          } else {
            delete this.data.attributes["描述"];
          }
          break;
        default:
          unknownNames.push(name);
      }
    }

    if (unknownNames.length) {
      return [
        "error",
        [
          "未知卡组属性名：",
          unknownNames.join("\n"),
        ].join("\n"),
      ];
    }

    return ["ok"];
  }

  addCards(
    cards: CardNameWithDescriptionAndOptionalAmount[],
    at: "top" | "bottom" | null,
    sender: UserID,
  ): ["ok"] | ["error", string] {
    const totalNewCards = //
      cards.reduce((acc, cur) => acc + (cur.amount ?? 1), 0);
    const totalOldCards = this.totalCards;
    const totalCards = totalNewCards + totalOldCards;
    const allowedCards = this.scope.attr卡组卡牌上限;
    if (totalCards > allowedCards) {
      return [
        "error",
        `若将指定的新卡（${totalOldCards} 张）添加至卡组，` +
        `卡组 “${this.name}” 中卡牌的数目将从 ${totalOldCards} 上升至 ${totalCards}，` +
        `超过领域 “${this.scope.name}” 所允许的上限 ${allowedCards} 张`,
      ];
    }

    for (const card of cards) {
      const cardInData = this.data.cards["" + card.name];
      if (card.description && cardInData) {
        return [
          "error",
          `名为 “${card.name}” 的卡牌已经存在于卡组中。` +
          "若要增加其数量，请以空描述的形式添加该卡牌；" +
          "若要修改其描述，请先从卡组中删除掉所有这个名字的卡牌",
        ];
      }
      if (cardInData) {
        cardInData.referenceCount += card.amount ?? 1;
      } else {
        this.data.cards["" + card.name] = {
          referenceCount: card.amount ?? 1,
          description: card.description,
          providerID: "" + sender,
        };
      }
    }

    const flatCards: string[] = [];
    for (const card of cards) {
      for (let i = 0; i < (card.amount ?? 1); i++) {
        flatCards.push("" + card.name);
      }
    }

    switch (at) {
      case "top":
        this.data.drawPile.push(...flatCards.reverse());
        break;
      case "bottom":
        this.data.drawPile.splice(0, 0, ...flatCards.reverse());
        break;
      case null:
        for (const name of flatCards) {
          this.putInDrawPileAtRandomLocation(name);
        }
        break;
      default:
        exhaustive(at);
    }

    return ["ok"];
  }

  putInDrawPileAtRandomLocation(name: string) {
    const idx = randomInt(0, this.data.drawPile.length);
    this.data.drawPile.splice(idx, 0, name);
  }

  getCard(name: CardName): Card | null {
    const card = this.data.cards["" + name];
    if (!card) return null;
    return new Card(name, card.description, new UserID(card.providerID));
  }

  getSortedCardsWithAmount(): [Card, number][] {
    const names = Object.keys(this.data.cards).sort();
    const cards: [Card, number][] = [];
    for (const name of names) {
      const card = this.data.cards[name];
      cards.push([
        new Card(
          new CardName(name),
          card.description,
          new UserID(card.providerID),
        ),
        card.referenceCount,
      ]);
    }
    return cards;
  }

  getCardsInDiscardPile(): Card[] {
    return this.data.discardPile.map((name) => {
      const card = this.data.cards[name];
      return new Card(
        new CardName(name),
        card.description,
        new UserID(card.providerID),
      );
    });
  }

  deleteCard(
    cards: CardNameWithOptionalAmount[],
    senderID: UserID,
  ): ["ok"] | ["error", string] {
    for (const card of cards) {
      const name = "" + card.name;
      const cardInData = this.data.cards[name];
      if (!cardInData) {
        return [
          "error",
          `卡组 “${this.name}” 不存在名为 “${name}” 的卡牌`,
        ];
      }
      if (
        cardInData.providerID !== "" + senderID &&
        !this.mainOwner.equals(senderID) &&
        !this.scope.isAdmin(senderID)
      ) { // TODO!: 记得在实现了 “通过卡组属性指定的拥有者” 后加上对应的判断条件。
        return [
          "error",
          "只有本张卡的添加者、本卡组的拥有者、本领域的管理员或插件的主要管理员可以删除本张卡",
        ];
      }
      const countInDrawPile = //
        this.data.drawPile.filter((x) => x === name).length;
      const areAllInDrawPile = countInDrawPile !== cardInData.referenceCount;
      if (card.amount === "all") {
        if (areAllInDrawPile) {
          return [
            "error",
            `若要删除全部的 “${name}”，` +
            "请先将全部的该牌回收至抽牌堆" +
            `（该牌共有 ${cardInData.referenceCount} 张，其中 ${countInDrawPile} 位于抽牌堆。）`,
          ];
        }
        this.data.drawPile = //
          this.data.drawPile.filter((x) => x !== name);
        delete this.data.cards[name];
      } else {
        const toDelete = card.amount ?? 1;
        if (toDelete > countInDrawPile) {
          if (areAllInDrawPile) {
            return ["error", `“${name}” 不足 ${toDelete} 张`];
          } else {
            return [
              "error",
              `抽牌堆中的 “${name}” 不足 ${toDelete} 张` +
              `（在整个卡组中共有 ${cardInData.referenceCount} 张）`,
            ];
          }
        }

        const idxs: number[] = [];
        for (const i in this.data.drawPile) {
          if (this.data.drawPile[i] === name) {
            idxs.push(Number(i));
          }
        }

        for (let i = 0; i < toDelete; i++) {
          const pickedIdx = randomInt(0, idxs.length - 1);
          const [idx] = idxs.splice(pickedIdx, 1);
          for (let j = pickedIdx; j < idxs.length; j++) {
            idxs[j]--;
          }
          this.data.drawPile.splice(idx, 1);
        }

        if (idxs.length) {
          this.data.cards[name].referenceCount = idxs.length;
        } else {
          delete this.data.cards[name];
        }
      }
    }

    return ["ok"];
  }

  shuffle(): ["ok"] {
    shuffle(this.data.drawPile);
    return ["ok"];
  }

  draw(n: number): ["ok", Card[]] | ["error", string] {
    if (this.data.drawPile.length === 0) {
      return ["error", "抽牌堆为空，无法抽卡"];
    }
    const cards: string[] = [];
    const putBackMode = this.putBackMode;
    switch (putBackMode) {
      case "放回": {
        for (let i = 0; i < n; i++) {
          const drawn = this.data.drawPile.pop();
          if (!drawn) throw new Error("? 放回");
          cards.push(drawn);
          // TODO!!: 是不是等抽光后洗牌更符合常理一些？
          this.putInDrawPileAtRandomLocation(drawn);
        }
        break;
      }

      case "不放回": {
        if (this.data.drawPile.length < n) {
          return [
            "error",
            `抽牌堆中只有 ${this.data.drawPile.length} 张卡` +
            `无法满足不放回地抽 ${n} 张卡`,
          ];
        }

        for (let i = 0; i < n; i++) {
          const drawn = this.data.drawPile.pop();
          if (!drawn) throw new Error("? 不放回");
          cards.push(drawn);
        }
        break;
      }

      case "放回不重复": {
        const uniqueCardsInDrawPile: string[] = [];
        for (const name of this.data.drawPile) {
          if (uniqueCardsInDrawPile.indexOf(name) < 0) {
            uniqueCardsInDrawPile.push(name);
          }
        }
        if (uniqueCardsInDrawPile.length < n) {
          return [
            "error",
            `抽卡池中只有 ${uniqueCardsInDrawPile.length} 种卡` +
            `无法满足抽 ${n} 种不同的卡`,
          ];
        }

        const miss: string[] = [];
        while (cards.length < n) {
          const drawn = this.data.drawPile.pop();
          if (!drawn) throw new Error("? 放回不重复");
          if (cards.indexOf(drawn) < 0) {
            cards.push(drawn);
          } else {
            miss.push(drawn);
          }
        }

        for (const name of [...cards, ...miss]) {
          this.putInDrawPileAtRandomLocation(name);
        }
        break;
      }

      case "放回不独立": {
        if (this.data.drawPile.length < n) {
          return [
            "error",
            `抽牌堆中只有 ${this.data.drawPile.length} 张卡` +
            `无法满足一次性抽 ${n} 张卡`,
          ];
        }

        for (let i = 0; i < n; i++) {
          const drawn = this.data.drawPile.pop();
          if (!drawn) throw new Error("? 放回不独立");
          cards.push(drawn);
        }

        for (const name of cards) {
          this.putInDrawPileAtRandomLocation(name);
        }
        break;
      }

      default:
        exhaustive(putBackMode);
    }

    const finalCards = cards.map((name) => {
      const cardInData = this.data.cards[name];
      return new Card(
        new CardName(name),
        cardInData.description,
        new UserID(cardInData.providerID),
      );
    });

    const discardFlags = this.discardFlags;
    if (putBackMode === "不放回") {
      if (discardFlags.弃牌堆) {
        this.data.discardPile.push(...cards);
      } else {
        for (const name of cards) {
          this.data.cards[name].referenceCount--;
          if (!this.data.cards[name].referenceCount) {
            delete this.data.cards[name];
          }
        }
      }
    }

    return ["ok", finalCards];
  }

  recycleAllCardsDiscardPile(): ["ok"] {
    for (const name of this.data.discardPile) {
      this.putInDrawPileAtRandomLocation(name);
    }
    this.data.discardPile = [];

    return ["ok"];
  }

  deleteAllCardsInDiscardPile(): ["ok"] {
    for (const name of this.data.discardPile) {
      this.data.cards[name].referenceCount--;
      if (!this.data.cards[name].referenceCount) {
        delete this.data.cards[name];
      }
    }
    this.data.discardPile = [];

    return ["ok"];
  }
}
