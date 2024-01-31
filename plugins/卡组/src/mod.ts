import "astral-dice-types";

import packageJSON from "../package.json" assert { type: "json" };

import { parseCommand, parseDeckCommand } from "./commands/parsing.ts";
import { Scope, Scopes } from "./models/scopes.ts";
import { DeckName, GroupID, UserID } from "./ids.ts";
import { astralRepo } from "./repo.ts";
import { PLUGIN_NAME, ROOT_PREFIX } from "./consts.ts";
import { exhaustive } from "./ts-utils.ts";
import { PluginCommandExecutor } from "./executors/plugin.ts";
import { DeckExistenceCommandExecutor } from "./executors/deck_existence.ts";
import { Deck } from "./models/decks.ts";
import { DeckCommandExecutor } from "./executors/deck.ts";
import { DeckDiscardPileCommandExecutor } from "./executors/deck_discard_pile.ts";
import { Command } from "./commands/mod.ts";

declare const v1: string, v2: string, v3: string;

type MainPrefix = "卡组" | ":" | "：";

const mainPrefix: MainPrefix = v1 as MainPrefix;
const restText = v2;
const senderID = v3;

// TODO: 放到更合适的地方去。
export type ExecutionResult =
  | ["ok", string, Saver]
  | ["error", string]
  | ["todo", string?];
// TODO: 放到更合适的地方去。
export type Saver =
  | null
  | { scopes: Scope[] }
  | { scopes: Scope[]; decks: Deck[] }
  | { scopes: null; decks: Deck[] }
  | { scopes: Scope[]; deleteDecks: DeckName[] };

function main(mainPrefix: MainPrefix, restText: string, senderID_: string) {
  const senderID = new UserID(senderID_);

  let cmd: Command;
  let mainAdmins: UserID[];
  let scope: Scope;
  let parseResult: ReturnType<typeof parseCommand>;
  if (mainPrefix === "卡组") {
    parseResult = parseCommand(restText, { rootPrefix: ROOT_PREFIX });
    if (parseResult[0] === "ignore") return;
    if (parseResult[0] === "error") {
      Lib.reply("错误：\n" + parseResult[1]);
      return;
    }
    cmd = parseResult[1];

    mainAdmins = getMainAdmins();
    const scope_ = getScope({ mainAdmins });

    if (cmd.type === "plugin" && cmd.payload.type === "") {
      Lib.reply(generatePluginInfo({ mainAdmins, scope: scope_ }));
      return;
    }

    if (scope_) {
      scope = scope_;
    } else {
      return;
    }
  } else {
    mainAdmins = getMainAdmins();
    const scope_ = getScope({ mainAdmins });
    if (!scope_) return;
    scope = scope_;

    const defaultDeckName = scope?.attr默认卡组;
    if (!defaultDeckName) return;

    parseResult = parseDeckCommand(restText, defaultDeckName, {
      rootPrefix: ROOT_PREFIX,
    });
    if (parseResult[0] === "error") {
      Lib.reply("错误：\n" + parseResult[1]);
      return;
    }
    cmd = parseResult[1];
  }

  let execResult: ExecutionResult;
  switch (cmd.type) {
    case "plugin": {
      if (cmd.payload.type === "") {
        execResult = ["error", "unreachable"]; // “卡组” 是提前处理的命令。
        break;
      }
      const executor = new PluginCommandExecutor(scope, senderID, {
        usageURL: ("" + Lib.getConfig("usage-url")) || null,
      });
      execResult = executor.execute(cmd.payload);
      break;
    }
    case "deck_existence": {
      if (cmd.payload.type === "创建") {
        execResult = DeckExistenceCommandExecutor //
          .execute创建(scope, cmd.deckName, senderID, cmd.payload);
      } else {
        execResult = withDeck(
          scope,
          cmd.deckName,
          cmd.payload,
          (deck, payload) => {
            const executor = //
              new DeckExistenceCommandExecutor(scope, deck, senderID);
            return executor.execute(payload);
          },
        );
      }
      break;
    }
    case "deck": {
      execResult = withDeck(
        scope,
        cmd.deckName,
        cmd.payload,
        (deck, payload) => {
          const executor = new DeckCommandExecutor(scope, deck, senderID);
          return executor.execute(payload);
        },
      );
      break;
    }
    case "deck_discard_pile": {
      execResult = withDeck(
        scope,
        cmd.deckName,
        cmd.payload,
        (deck, payload) => {
          const executor = //
            new DeckDiscardPileCommandExecutor(scope, deck, senderID);
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
          astralRepo.saveDeckData(deck);
        }
        for (
          const deckName of ("deleteDecks" in saver && saver.deleteDecks) || []
        ) {
          astralRepo.deleteDeck(deckName, scope.name);
        }
        for (const scope of ("scopes" in saver && saver.scopes) || []) {
          astralRepo.saveScopeData(scope);
        }
      }
      Lib.reply(execResult[1]);
      break;
    }
    case "error":
      Lib.reply("错误：" + execResult[1]);
      break;
    case "todo":
      Lib.reply([
        `TODO: ${execResult[1] ?? "实现对应功能"}`,
        "",
        "输入：",
        mainPrefix + restText,
        "解析结果：",
        JSON.stringify(parseResult, null, 2),
      ].join("\n"));
      break;
    default:
      exhaustive(execResult[0]);
  }
}

function generatePluginInfo(opts: {
  mainAdmins: UserID[];
  scope: Scope | null;
}): string {
  const lines = [
    `= ${PLUGIN_NAME}插件 =`,
    "版本：" + packageJSON.version,
    "主页：" + packageJSON.homepage,
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
    lines.push("本群不属于任何领域，将不响应除本命令（“卡组”）外的其他命令。");
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

function getMainAdmins() {
  return (JSON.parse("" + Lib.getConfig("main-admins")) as string[])
    .map((a) => new UserID(String(a)));
}

function getScope(opts: { mainAdmins: UserID[] }) {
  const scopeData = JSON.parse("" + Lib.getConfig("scopes"));
  const scopes = new Scopes(scopeData, opts.mainAdmins);
  const groupID = new GroupID("" + Lib.getGroup());
  return scopes.getScopeByGroup(astralRepo, groupID);
}

function withDeck<T>(
  scope: Scope,
  deckName: DeckName,
  payload: T,
  cb: (deck: Deck, payload: T) => ExecutionResult,
): ExecutionResult {
  const deckResult = astralRepo.loadDeckData(scope.name, deckName);
  if (deckResult[0] === "error") throw new Error(deckResult[1]);
  const deckData = deckResult[1];
  if (deckData) {
    const deck = new Deck(deckName, deckData, scope);
    return cb(deck, payload);
  } else {
    return [
      "error",
      `领域 “${scope.name}” 当中不存在卡组 “${deckName}”`,
    ];
  }
}

try {
  main(mainPrefix, restText, senderID);
} catch (e) {
  Lib.reply([
    `${PLUGIN_NAME}插件执行途中抛出！`,
    "输入：",
    mainPrefix + restText,
    "命令发起者：" + senderID,
    (e instanceof Error) ? "错误消息：" + e.message : "抛出的对象并非错误。",
  ].join("\n"));
}
