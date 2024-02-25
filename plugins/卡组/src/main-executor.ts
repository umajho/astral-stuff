import { AstralDiceAPI } from "astral-dice-types";

import { Command, parseCommand, parseDeckCommand } from "./commands/mod.ts";
import { PLUGIN_NAME } from "./consts.ts";
import { DeckCommandExecutor } from "./executors/deck.ts";
import { DeckDiscardPileCommandExecutor } from "./executors/deck_discard_pile.ts";
import { DeckExistenceCommandExecutor } from "./executors/deck_existence.ts";
import { PluginCommandExecutor } from "./executors/plugin.ts";
import { DeckName, GroupID, UserID } from "./ids.ts";
import { Deck } from "./models/decks.ts";
import { Scope, Scopes } from "./models/scopes.ts";
import { AstralRepo, Repo } from "./repo.ts";
import { exhaustive } from "./ts-utils.ts";

export type ExecutionResult =
  | ["ok", string, Saver]
  | ["error", string]
  | ["todo", string?];
export type Saver =
  | null
  | { scopes: Scope[] }
  | { scopes: Scope[]; decks: Deck[] }
  | { scopes: null; decks: Deck[] }
  | { scopes: Scope[]; deleteDecks: DeckName[] };

export class MainExecutor {
  private readonly repo: Repo;
  private readonly info: { version: string; homepage: string };
  private readonly rootPrefix: string;
  /**
   * - "regular": 一般模式。开头用的是根前缀（如 “卡组”）。
   * - "for_scope_default": 领域默认卡组模式。
   *   开头用的是冒号（“:” 或 “：”），相当于此冒号被扩展为 “<根前缀>：<领域默认卡组>”。
   */
  private readonly mode: "regular" | "for_scope_default";
  /**
   * 完整的输入，不用于解析，仅用于帮助信息等辅助功能。
   */
  private readonly inputFull: string;
  /**
   * 紧随决定模式的前缀之后的输入，用于解析
   */
  private readonly inputAfterPrefix: string;
  private readonly senderID: UserID;
  constructor(
    private readonly api: AstralDiceAPI,
    opts: {
      info: { version: string; homepage: string };
      rootPrefix: string;
      mode: "regular" | "for_scope_default";
      inputFull: string;
      inputAfterPrefix: string;
      senderID: UserID;
    },
  ) {
    this.repo = new AstralRepo(api);

    this.info = opts.info;
    this.rootPrefix = opts.rootPrefix;
    this.mode = opts.mode;
    this.inputFull = opts.inputFull;
    this.inputAfterPrefix = opts.inputAfterPrefix;
    this.senderID = opts.senderID;
  }

  private hasBeenExecuted = false;

  execute() {
    if (this.hasBeenExecuted) {
      throw new Error("unreachable");
    }
    this.hasBeenExecuted = true;

    let cmd: Command;
    let mainAdmins: UserID[];
    let scope: Scope;
    let parseResult: ReturnType<typeof parseCommand>;
    if (this.mode === "regular") {
      parseResult = parseCommand(this.inputAfterPrefix, {
        rootPrefix: this.rootPrefix,
      });
      if (parseResult[0] === "ignore") return;
      if (parseResult[0] === "error") {
        this.api.reply("错误：\n" + parseResult[1]);
        return;
      }
      cmd = parseResult[1];

      mainAdmins = this.getMainAdmins();
      const scope_ = this.getScope({ mainAdmins });

      if (cmd.type === "plugin" && cmd.payload.type === "概览") {
        this.api.reply(this.generatePluginInfo({ mainAdmins, scope: scope_ }));
        return;
      }

      if (scope_) {
        scope = scope_;
      } else {
        return;
      }
    } else {
      mainAdmins = this.getMainAdmins();
      const scope_ = this.getScope({ mainAdmins });
      if (!scope_) return;
      scope = scope_;

      const defaultDeckName = scope?.attr默认卡组;
      if (!defaultDeckName) return;

      parseResult = parseDeckCommand(this.inputAfterPrefix, defaultDeckName, {
        rootPrefix: this.rootPrefix,
      });
      if (parseResult[0] === "error") {
        this.api.reply("错误：\n" + parseResult[1]);
        return;
      }
      cmd = parseResult[1];
    }

    let execResult: ExecutionResult;
    switch (cmd.type) {
      case "plugin": {
        if (cmd.payload.type === "概览") {
          execResult = ["error", "unreachable"]; // “卡组” 是提前处理的命令。
          break;
        }
        const executor = new PluginCommandExecutor(scope, this.senderID, {
          rootPrefix: this.rootPrefix,
          usageURL: ("" + this.api.getConfig("usage-url")) || null,
        });
        execResult = executor.execute(cmd.payload);
        break;
      }
      case "deck_existence": {
        if (cmd.payload.type === "创建") {
          execResult = DeckExistenceCommandExecutor //
            .execute创建(scope, cmd.deckName, this.senderID, cmd.payload);
        } else {
          execResult = this.withDeck(
            scope,
            cmd.deckName,
            cmd.payload,
            (deck, payload) => {
              const executor = //
                new DeckExistenceCommandExecutor(scope, deck, this.senderID);
              return executor.execute(payload);
            },
          );
        }
        break;
      }
      case "deck": {
        execResult = this.withDeck(
          scope,
          cmd.deckName,
          cmd.payload,
          (deck, payload) => {
            const executor = //
              new DeckCommandExecutor(scope, deck, this.senderID);
            return executor.execute(payload);
          },
        );
        break;
      }
      case "deck_discard_pile": {
        execResult = this.withDeck(
          scope,
          cmd.deckName,
          cmd.payload,
          (deck, payload) => {
            const executor = //
              new DeckDiscardPileCommandExecutor(scope, deck, this.senderID);
            return executor.execute(payload);
          },
        );
        break;
      }
      case "deck_hand": {
        execResult = ["todo"];
        break;
      }
      case "between_decks":
        execResult = ["todo"];
        break;
    }

    switch (execResult[0]) {
      case "ok": {
        const saver = execResult[2];
        if (saver) {
          for (const deck of ("decks" in saver && saver.decks) || []) {
            this.repo.saveDeckData(deck);
          }
          for (
            const deckName of ("deleteDecks" in saver && saver.deleteDecks) ||
              []
          ) {
            this.repo.deleteDeck(deckName, scope.name);
          }
          for (const scope of ("scopes" in saver && saver.scopes) || []) {
            this.repo.saveScopeData(scope);
          }
        }
        this.api.reply(execResult[1]);
        break;
      }
      case "error":
        this.api.reply("错误：" + execResult[1]);
        break;
      case "todo":
        this.api.reply([
          `TODO: ${execResult[1] ?? "实现对应功能"}`,
          "",
          "输入：",
          this.inputFull,
          "解析结果：",
          JSON.stringify(parseResult, null, 2),
        ].join("\n"));
        break;
      default:
        exhaustive(execResult[0]);
    }
  }

  private generatePluginInfo(opts: {
    mainAdmins: UserID[];
    scope: Scope | null;
  }): string {
    const lines = [
      `= ${PLUGIN_NAME}插件 =`,
      "版本：" + this.info.version,
      "主页：" + this.info.homepage,
      "主管理员：" + opts.mainAdmins.map((a) => "" + a).join("、"),
      "",
      "通过 “卡组帮助” 获取插件用法。",
      "",
      "== 关于本群 ==",
    ];
    if (opts.scope) {
      lines.push(
        `所属领域：“${opts.scope.name}”（含 ${opts.scope.groups.length} 个群）`,
      );
    } else {
      lines.push(
        "本群不属于任何领域，将不响应除本命令（“卡组”）外的其他命令。",
      );
    }
    lines.push("若要调整领域设置，请修改插件本体文件中的 “scopes” 字段。");
    if (opts.scope) {
      lines.push(...[
        "",
        `== 关于领域 “${opts.scope.name}”`,
        "=== 属性 ===",
        opts.scope.generateAttributesText(),
      ]);
    }

    return lines.join("\n");
  }

  private getMainAdmins() {
    return (JSON.parse("" + this.api.getConfig("main-admins")) as string[])
      .map((a) => new UserID(String(a)));
  }

  private getScope(opts: { mainAdmins: UserID[] }) {
    const scopeData = JSON.parse("" + this.api.getConfig("scopes"));
    const scopes = new Scopes(scopeData, opts.mainAdmins);
    const groupID = new GroupID("" + this.api.getGroup());
    return scopes.getScopeByGroup(this.repo, groupID);
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
      return [
        "error",
        [
          `领域 “${scope.name}” 当中不存在卡组 “${deckName}”`,
          "",
          `（发送 “${this.rootPrefix}：${deckName} 创建” 创建该卡组。）`,
          `（发送 “${this.rootPrefix}帮助 卡组存在::创建” 查询前述命令的用法。）`,
        ].join("\n"),
      ];
    }
  }
}
