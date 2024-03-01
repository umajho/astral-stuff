import {
  CardNameWithDescriptionAndOptionalAmount,
  DeckCommand,
} from "../commands/mod.ts";
import { CardName, UserID } from "../ids.ts";
import { ExecutionResult } from "../main-executor.ts";
import { Deck } from "../models/decks.ts";
import { Scope } from "../models/scopes.ts";
import { exhaustive } from "../ts-utils.ts";

export class DeckCommandExecutor {
  constructor(
    private readonly scope: Scope,
    private readonly deck: Deck,
    private readonly senderID: UserID,
    private readonly opts: {
      rootPrefix: string;
    },
  ) {}

  execute(cmd: DeckCommand): ExecutionResult {
    switch (cmd.type) {
      case "概览":
        return this.execute概览(cmd);
      case "列表":
        return this.execute列表(cmd);
      case "查看":
        return this.execute查看(cmd);
      case "设置":
        return this.execute设置(cmd);
      case "添加":
        return this.execute添加(cmd);
      case "删除":
        return this.execute删除(cmd);
      case "洗牌":
        return this.execute洗牌(cmd);
      case "回收全部并洗牌": // TODO!
        return this.execute回收全部并洗牌(cmd);
      case "抽卡":
        return this.execute抽卡(cmd);
      case "窥视":
        return ["todo"];
      default:
        exhaustive(cmd);
    }
  }

  execute概览(_cmd: DeckCommand & { type: "概览" }): ExecutionResult {
    return ["ok", this.deck.generateSummaryText(), null];
  }

  execute列表(_cmd: DeckCommand & { type: "列表" }): ExecutionResult {
    const cards = this.deck.getSortedCardsWithAmount();
    const statis =
      `共 ${this.deck.totalCardKinds} 种、${this.deck.totalCards} 张`;
    const lines = [`卡组 “${this.deck.name}” 现有卡牌（${statis}）`];
    for (const [card, amount] of cards) {
      lines.push(card.generateShortText({ amount }));
    }
    return ["ok", lines.join("\n"), null];
  }

  execute查看(cmd: DeckCommand & { type: "查看" }): ExecutionResult {
    let texts: string[] = [];
    for (const name of cmd.cards) {
      const card = this.deck.getCard(name);
      if (!card) {
        texts.push(`不存在名为 “${name}” 的卡牌。`);
        continue;
      }
      texts.push(card.generateFullText());
    }
    return ["ok", texts.join("\n\n---\n"), null];
  }

  execute设置(cmd: DeckCommand & { type: "设置" }): ExecutionResult {
    if (!cmd.flagSetters.length && !Object.keys(cmd.attributeSetters).length) {
      return [
        "error",
        [
          "需要至少提供一项要更新的设置",
          "",
          `（如要查看卡组现有设置，发送 “${this.opts.rootPrefix}：${this.deck.name} 概览”。）`,
        ].join("\n"),
      ];
    }

    if (cmd.flagSetters.length) {
      const updateResult = //
        this.deck.updateFlags(cmd.flagSetters, this.senderID);
      if (updateResult[0] === "error") return updateResult;
    }

    if (Object.keys(cmd.attributeSetters).length) {
      const updateResult = //
        this.deck.updateAttributes(cmd.attributeSetters);
      if (updateResult[0] === "error") return updateResult;
    }

    return [
      "ok",
      [
        `成功更新卡组 “${this.deck.name}” 设置：`,
        "",
        this.deck.generateSummaryText(),
      ].join("\n"),
      { scopes: [this.scope], decks: [this.deck] },
    ];
  }

  execute添加(cmd: DeckCommand & { type: "添加" }): ExecutionResult {
    const addResult = this.deck.addCards(cmd.cards, cmd.at, this.senderID);
    if (addResult[0] === "error") return addResult;

    // TODO: 也许统计信息应该由 `addCards` 返回。
    let msg = `成功添加 ${summarizeCards(cmd.cards)}。`;

    return ["ok", msg, { scopes: [this.scope], decks: [this.deck] }];
  }

  execute删除(cmd: DeckCommand & { type: "删除" }): ExecutionResult {
    const deleteResult = this.deck.deleteCard(cmd.cards, this.senderID);
    if (deleteResult[0] === "error") return deleteResult;

    // TODO!!: 应该像 `execute添加` 一样包含统计信息。
    return [
      "ok",
      "成功删除卡牌。",
      { scopes: [this.scope], decks: [this.deck] },
    ];
  }

  execute洗牌(_cmd: DeckCommand & { type: "洗牌" }): ExecutionResult {
    const result = this.deck.shuffle();
    if (result[0] !== "ok") return ["error", "? shuffle in execute洗牌"];
    return ["ok", "已完成洗牌。", { scopes: [this.scope], decks: [this.deck] }];
  }

  execute回收全部并洗牌(
    _cmd: DeckCommand & { type: "回收全部并洗牌" },
  ): ExecutionResult {
    return ["todo"];
  }

  execute抽卡(cmd: DeckCommand & { type: "抽卡" }): ExecutionResult {
    if (cmd.to === "senderPrivate") {
      return ["todo", "抽卡结果送至私聊"];
    }

    const result = this.deck.draw(cmd.amount ?? 1);
    if (result[0] === "error") return result;

    const msg = "= 抽卡结果 =\n\n" +
      result[1].map((c) => c.generateFullText()).join("\n\n---\n");
    return ["ok", msg, { scopes: [this.scope], decks: [this.deck] }];
  }
}

function summarizeCards(cards: CardNameWithDescriptionAndOptionalAmount[]) {
  const cardSet: [CardName, number][] = [];
  let total = 0;
  OUTER:
  for (const card of cards) {
    const amount = card.amount ?? 1;
    total += amount;
    for (const i in cardSet) {
      const [seenName, seenN] = cardSet[i];
      if (seenName.equals(card.name)) {
        cardSet[i] = [seenName, seenN + amount];
        continue OUTER;
      }
    }
    cardSet.push([card.name, amount]);
  }

  const shownCards = cardSet.slice(0, 5).map(([name, n]) => `“${n}#${name}”`)
    .join("、");

  return `${shownCards} ${cardSet.length > 5 ? "等" : ""}` +
    `总计 ${cardSet.length} 种、${total} 张卡牌`;
}
