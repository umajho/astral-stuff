import { exhaustive } from "ts-utils";

import { Command } from "./commands/types.ts";
import { DeckCommandExecutor } from "./executors/deck.ts";
import { DeckDiscardPileCommandExecutor } from "./executors/deck_discard_pile.ts";
import { DeckExistenceCommandExecutor } from "./executors/deck_existence.ts";
import { PluginCommandExecutor } from "./executors/plugin.ts";
import { DeckName, UserID } from "./ids.ts";
import { Deck } from "./models/decks.ts";
import { Scope } from "./models/scopes.ts";
import { Repo } from "./repo.ts";

export type ExecutionResult =
  | ["ok", string, Saver]
  | ["error", string]
  | ["error_2", ["no_deck", { deckName: DeckName }]]
  | ["todo", string?];
export type Saver =
  | null
  | { scopes: Scope[]; decks?: Deck[]; deleteDecks?: DeckName[] };

export class CommandExecutor {
  private readonly pluginName: string;
  private readonly repo: Repo;
  private readonly info: { version: string; homepage: string };
  private readonly rootPrefix: string;
  private readonly usageURL: string | null;
  private readonly scope: Scope;

  private readonly mainAdmins: UserID[];
  private readonly senderID: UserID;
  constructor(
    opts: {
      pluginName: string;
      info: { version: string; homepage: string };
      rootPrefix: string;
      usageURL: string | null;
      repo: Repo;
      scope: Scope;
      mainAdmins: UserID[];
      senderID: UserID;
    },
  ) {
    this.repo = opts.repo;

    this.pluginName = opts.pluginName;
    this.info = opts.info;
    this.rootPrefix = opts.rootPrefix;
    this.usageURL = opts.usageURL;
    this.scope = opts.scope;
    this.mainAdmins = opts.mainAdmins;
    this.senderID = opts.senderID;
  }

  private hasBeenExecuted = false;

  execute(cmd: Command): ExecutionResult {
    if (this.hasBeenExecuted) {
      throw new Error("unreachable");
    }
    this.hasBeenExecuted = true;

    switch (cmd.type) {
      case "plugin": {
        const executor = new PluginCommandExecutor(this.scope, this.senderID, {
          pluginName: this.pluginName,
          rootPrefix: this.rootPrefix,
          info: this.info,
          usageURL: this.usageURL,
          mainAdmins: this.mainAdmins,
        });
        return executor.execute(cmd.payload);
      }
      case "deck_existence": {
        if (cmd.payload.type === "创建") {
          return DeckExistenceCommandExecutor //
            .execute创建(this.scope, cmd.deckName, this.senderID, cmd.payload);
        } else {
          return this.withDeck(
            this.scope,
            cmd.deckName,
            cmd.payload,
            (deck, payload) => {
              const executor = new DeckExistenceCommandExecutor(
                this.scope,
                deck,
                this.senderID,
              );
              return executor.execute(payload);
            },
          );
        }
      }
      case "deck": {
        return this.withDeck(
          this.scope,
          cmd.deckName,
          cmd.payload,
          (deck, payload) => {
            const executor = //
              new DeckCommandExecutor(this.scope, deck, this.senderID, {
                rootPrefix: this.rootPrefix,
              });
            return executor.execute(payload);
          },
        );
      }
      case "deck_discard_pile": {
        return this.withDeck(
          this.scope,
          cmd.deckName,
          cmd.payload,
          (deck, payload) => {
            const executor = new DeckDiscardPileCommandExecutor(
              this.scope,
              deck,
              this.senderID,
            );
            return executor.execute(payload);
          },
        );
      }
      case "deck_hand":
        return ["todo"];
      case "between_decks":
        return ["todo"];
      default:
        exhaustive(cmd);
    }
  }

  private withDeck<T>(
    scope: Scope,
    deckName: DeckName,
    payload: T,
    cb: (deck: Deck, payload: T) => ExecutionResult,
  ): ExecutionResult {
    const deckResult = this.repo.loadDeckData(scope.name, deckName);
    if (deckResult[0] === "error") throw new Error(deckResult[1]);
    const deckData = deckResult[1];
    if (deckData) {
      const deck = new Deck(deckName, deckData, scope);
      return cb(deck, payload);
    } else {
      return ["error_2", ["no_deck", { deckName }]];
    }
  }
}
