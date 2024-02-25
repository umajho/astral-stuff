import { DeckDiscardPileCommand } from "../commands/mod.ts";
import { UserID } from "../ids.ts";
import { ExecutionResult } from "../main-executor.ts";
import { Deck } from "../models/decks.ts";
import { Scope } from "../models/scopes.ts";
import { exhaustive } from "../ts-utils.ts";

export class DeckDiscardPileCommandExecutor {
  constructor(
    private readonly scope: Scope,
    private readonly deck: Deck,
    private readonly senderID: UserID,
  ) {}

  execute(cmd: DeckDiscardPileCommand): ExecutionResult {
    switch (cmd.type) {
      case "列表":
        return this.execute列表(cmd);
      case "回收": // TODO!
        return this.execute回收(cmd);
      case "回收全部并洗牌":
        return this.execute回收全部并洗牌(cmd);
      case "删除全部":
        return this.execute删除全部(cmd);
      default:
        exhaustive(cmd);
    }
  }

  execute列表(cmd: DeckDiscardPileCommand & { type: "列表" }): ExecutionResult {
    const cards = this.deck.getCardsInDiscardPile();
    const uniqueNames: string[] = [];
    for (const card of cards) {
      if (uniqueNames.indexOf("" + card.name) < 0) {
        uniqueNames.push("" + card.name);
      }
    }
    const statis = `共 ${uniqueNames.length} 种、${cards.length} 张`;
    const lines = [
      `卡组 “${this.deck.name}” 弃牌堆现有卡牌（${statis}）`,
    ];
    for (const card of cards) {
      lines.push(card.generateShortText());
    }
    return ["ok", lines.join("\n"), null];
  }

  execute回收(cmd: DeckDiscardPileCommand & { type: "回收" }): ExecutionResult {
    return ["todo"];
  }

  execute回收全部并洗牌(
    _cmd: DeckDiscardPileCommand & { type: "回收全部并洗牌" },
  ): ExecutionResult {
    const recycleResult = this.deck.recycleAllCardsDiscardPile();
    if (recycleResult[0] !== "ok") {
      return ["error", "? recycleDiscardPile in execute回收全部并洗牌"];
    }

    const shuffleResult = this.deck.shuffle();
    if (shuffleResult[0] !== "ok") {
      return ["error", "? shuffleResult in execute回收全部并洗牌"];
    }

    return [
      "ok",
      "已将弃牌堆中的全部卡牌回收至抽牌堆中。",
      { scopes: null, decks: [this.deck] },
    ];
  }

  execute删除全部(
    cmd: DeckDiscardPileCommand & { type: "删除全部" },
  ): ExecutionResult {
    const result = this.deck.deleteAllCardsInDiscardPile();
    if (result[0] !== "ok") {
      return ["error", "? deleteAllCardsInDiscardPile in execute删除全部"];
    }

    return [
      "ok",
      "已删除弃牌堆中的全部卡牌",
      { scopes: null, decks: [this.deck] },
    ];
  }
}
