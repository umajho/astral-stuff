import { exhaustive } from "ts-utils";

import { DeckExistenceCommand } from "../commands/mod.ts";
import { DeckName, UserID } from "../ids.ts";
import { ExecutionResult } from "../main-executor.ts";
import { Deck, makeNewDeckData } from "../models/decks.ts";
import { Scope } from "../models/scopes.ts";

export class DeckExistenceCommandExecutor {
  constructor(
    private readonly scope: Scope,
    private readonly deck: Deck,
    private readonly senderID: UserID,
  ) {}

  static execute创建(
    scope: Scope,
    deckName: DeckName,
    senderID: UserID,
    cmd: DeckExistenceCommand & { type: "创建" },
  ): ExecutionResult {
    if (("" + deckName)[0] === ".") {
      return ["todo", "实现个人卡组"];
    }

    const declareResult = scope.declareDeck(deckName);
    if (declareResult[0] === "error") return declareResult;

    const deckData = makeNewDeckData(senderID);
    const deck = new Deck(deckName, deckData, scope);

    if (cmd.flagSetters.length) {
      const updateResult = deck.updateFlags(cmd.flagSetters, senderID);
      if (updateResult[0] === "error") return updateResult;
    }

    if (Object.keys(cmd.attributeSetters).length) {
      const updateResult = //
        deck.updateAttributes(cmd.attributeSetters);
      if (updateResult[0] === "error") return updateResult;
    }

    const addResult = deck.addCards(
      cmd.cards,
      cmd.keepsOrderOfCards ? "top" : null,
      senderID,
    );
    if (addResult[0] === "error") return addResult;

    return [
      "ok",
      [
        `成功创建卡组 “${deckName}”：`,
        "",
        deck.generateSummaryText(),
      ].join("\n"),
      { scopes: [scope], decks: [deck] },
    ];
  }

  execute(
    cmd: Exclude<DeckExistenceCommand, { type: "创建" }>,
  ): ExecutionResult {
    switch (cmd.type) {
      case "销毁":
        return this.execute销毁(cmd);
      case "导出":
      case "导入":
        return ["todo"];
      case "克隆为":
        return this.execute克隆为(cmd);
      case "重命名为":
        return this.execute重命名为(cmd);
      default:
        exhaustive(cmd);
    }
  }

  execute销毁(_cmd: DeckExistenceCommand & { type: "销毁" }): ExecutionResult {
    if (
      !this.senderID.equals(this.deck.mainOwner) &&
      !this.scope.isAdmin(this.senderID)
    ) {
      return [
        "error",
        "只有本卡组的主拥有者、本领域的管理员或插件的主要管理员可以销毁本卡组",
      ];
    }

    this.scope.revokeDeck(this.deck.name);
    return [
      "ok",
      `成功销毁卡组 “${this.deck.name}”。`,
      { scopes: [this.scope], deleteDecks: [this.deck.name] },
    ];
  }

  execute克隆为(
    cmd: DeckExistenceCommand & { type: "克隆为" },
  ): ExecutionResult {
    const declareResult = //
      this.scope.declareDeckByCloning(cmd.destination, this.deck.name);
    if (declareResult[0] === "error") return declareResult;
    const cloned = this.deck.clone(cmd.destination);

    return [
      "ok",
      `成功将卡组 “${this.deck.name}” 克隆为 “${cmd.destination.deckName}”`,
      { scopes: [this.scope], decks: [cloned] },
    ];
  }

  execute重命名为(
    cmd: DeckExistenceCommand & { type: "重命名为" },
  ): ExecutionResult {
    const declareResult = //
      this.scope.declareDeckByCloning(cmd.destination, this.deck.name);
    if (declareResult[0] === "error") return declareResult;
    const cloned = this.deck.clone(cmd.destination);

    this.scope.revokeDeck(this.deck.name);

    return [
      "ok",
      `成功将卡组 “${this.deck.name}” 重命名为 “${cmd.destination.deckName}”`,
      { scopes: [this.scope], decks: [cloned], deleteDecks: [this.deck.name] },
    ];
  }
}
