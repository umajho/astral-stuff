import { AstralDiceAPI } from "astral-dice-types";

import { Command, findCommandUsageHeadsByName } from "./commands/mod.ts";
import { DeckCommandExecutor } from "./executors/deck.ts";
import { DeckDiscardPileCommandExecutor } from "./executors/deck_discard_pile.ts";
import { DeckExistenceCommandExecutor } from "./executors/deck_existence.ts";
import { PluginCommandExecutor } from "./executors/plugin.ts";
import { DeckName, UserID } from "./ids.ts";
import { Deck } from "./models/decks.ts";
import { Scope } from "./models/scopes.ts";
import { Repo } from "./repo.ts";
import { exhaustive } from "./ts-utils.ts";

export type ExecutionResult =
  | ["ok", string, Saver]
  | ["error", string]
  | ["todo", string?];
export type Saver =
  | null
  | { scopes: Scope[]; decks?: Deck[]; deleteDecks?: DeckName[] };

export class MainExecutor {
  private readonly pluginName: string;
  private readonly repo: Repo;
  private readonly info: { version: string; homepage: string };
  private readonly rootPrefix: string;
  private readonly scope: Scope;

  private readonly mainAdmins: UserID[];
  private readonly senderID: UserID;
  constructor(
    private readonly api: AstralDiceAPI,
    opts: {
      pluginName: string;
      info: { version: string; homepage: string };
      rootPrefix: string;
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
          usageURL: ("" + this.api.getConfig("usage-url")) || null,
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
      const possibleIntentions: string[] = findCommandUsageHeadsByName(
        "" + deckName,
        { rootPrefix: this.rootPrefix },
      );

      return [
        "error",
        [
          `领域 “${scope.name}” 当中不存在卡组 “${deckName}”`,
          "",
          `（发送 “${this.rootPrefix}：${deckName} 创建” 创建该卡组。）`,
          `（发送 “${this.rootPrefix}帮助 卡组存在::创建” 查询前述命令的用法。）`,
          ...(possibleIntentions.length
            ? [
              `（是否其实想使用：${
                possibleIntentions.map((x) => `“${x}”`).join("")
              }？）`,
            ]
            : []),
        ].join("\n"),
      ];
    }
  }
}
