import { DeckName, ScopeID } from "./ids.ts";
import { Deck, DeckData } from "./models/decks.ts";
import { Scope, ScopeData } from "./models/scopes.ts";

export interface Repo {
  loadScopeData(scopeID: ScopeID): ["ok", ScopeData | null] | ["error", string];
  saveScopeData(scope: Scope): void;
  loadDeckData(
    scopeID: ScopeID,
    deckName: DeckName,
  ): ["ok", DeckData | null] | ["error", string];
  saveDeckData(deck: Deck): void;
  deleteDeck(deckName: DeckName, scopeID: ScopeID): void;
}
