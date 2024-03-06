import { AstralDiceAPI } from "astral-dice-types";

import {
  Deck,
  DeckData,
  DeckName,
  Repo,
  Scope,
  ScopeData,
  ScopeID,
} from "deck-core";

export class AstralRepo implements Repo {
  constructor(private lib: AstralDiceAPI) {}

  getScopeKey(scopeID: ScopeID) {
    return JSON.stringify(["scope", "" + scopeID]);
  }

  getDeckKey(scopeID: ScopeID, deckName: DeckName) {
    return JSON.stringify(["deck", "" + scopeID, "" + deckName]);
  }

  loadScopeData(
    scopeID: ScopeID,
  ): ["ok", ScopeData | null] | ["error", string] {
    let data: ScopeData | null;
    try {
      const stuff = this.lib.getValue(this.getScopeKey(scopeID));
      data = ("" + stuff) ? JSON.parse("" + stuff) : null;
    } catch (e) {
      return [
        "error",
        `读取领域 “${scopeID}” 的数据失败` +
        (e instanceof Error ? "：" + e.message : ""),
      ];
    }
    return ["ok", data];
  }

  saveScopeData(scope: Scope): void {
    const key = this.getScopeKey(scope.name);
    this.lib.setAsSolidValue(key);
    this.lib.setValue(key, JSON.stringify(scope.asData()));
  }

  loadDeckData(
    scopeID: ScopeID,
    deckName: DeckName,
  ): ["error", string] | ["ok", DeckData | null] {
    let data: DeckData | null;
    try {
      const stuff = this.lib.getValue(this.getDeckKey(scopeID, deckName));
      data = ("" + stuff) ? JSON.parse("" + stuff) : null;
    } catch (e) {
      return [
        "error",
        `读取领域 “${scopeID}” 的卡组 “${deckName}” 的数据失败` +
        (e instanceof Error ? "：" + e.message : ""),
      ];
    }
    return ["ok", data];
  }

  saveDeckData(deck: Deck): void {
    const key = this.getDeckKey(deck.scopeID, deck.name);
    this.lib.setAsSolidValue(key);
    this.lib.setValue(key, JSON.stringify(deck.asData()));
  }

  deleteDeck(deckName: DeckName, scopeID: ScopeID) {
    const key = this.getDeckKey(scopeID, deckName);
    this.lib.setValue(key, JSON.stringify(null)); // 保险
    this.lib.setValueExpireTime(key, 0);
  }
}
