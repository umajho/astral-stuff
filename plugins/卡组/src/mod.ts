import { AstralDiceAPI } from "astral-dice-types";

import packageJSON from "../package.json" assert { type: "json" };

import { DEFAULT_ROOT_PREFIX, PLUGIN_NAME } from "./consts.ts";
import { GroupID, UserID } from "./ids.ts";
import { ExecutionResult, MainExecutor } from "./main-executor.ts";
import { Scope, Scopes } from "./models/scopes.ts";
import { AstralRepo, Repo } from "./repo.ts";
import { Command, parseCommand, parseDeckCommand } from "./commands/mod.ts";
import { exhaustive } from "./ts-utils.ts";

type MainPrefix = "卡组" | ":" | "：";

declare const v1: string, v2: string, v3: string;

function main(
  api: AstralDiceAPI,
  opts: {
    pluginName: string;
    mainPrefix: MainPrefix;
    restText: string;
    senderID: UserID;
    rootPrefix: string;
  },
) {
  const repo = new AstralRepo(api);
  const mainAdmins = getMainAdmins(api);
  const scope = getScope(api, { repo, mainAdmins });

  const parseResult = parseTextInput({
    mode: opts.mainPrefix === opts.rootPrefix ? "regular" : "for_scope_default",
    rootPrefix: opts.rootPrefix,
    inputAfterPrefix: opts.restText,
    scope,
  });
  if (parseResult[0] === "ignore") return;
  if (parseResult[0] === "error") {
    api.reply("错误：\n" + parseResult[1]);
    return;
  }
  const cmd = parseResult[1];

  if (!scope) throw new Error("unreachable");

  const executor = //
    new MainExecutor(api, {
      pluginName: opts.pluginName,
      info: packageJSON,
      rootPrefix: opts.rootPrefix,
      repo,
      scope,
      senderID: opts.senderID,
      mainAdmins,
    });
  const result = executor.execute(cmd);

  processExecutionResult(api, result, {
    repo,
    scope,
    inputFull: opts.mainPrefix + opts.restText,
    command: cmd,
  });
}

function getScope(api: AstralDiceAPI, opts: {
  repo: Repo;
  mainAdmins: UserID[];
}): Scope | null {
  const scopeData = JSON.parse("" + api.getConfig("scopes"));
  const scopes = new Scopes(scopeData, opts.mainAdmins);
  const groupID = new GroupID("" + api.getGroup());
  return scopes.getScopeByGroup(opts.repo, groupID);
}

function getMainAdmins(api: AstralDiceAPI): UserID[] {
  return (JSON.parse("" + api.getConfig("main-admins")) as string[])
    .map((a) => new UserID(String(a)));
}

function parseTextInput(opts: {
  /**
   * - "regular": 一般模式。开头用的是根前缀（如 “卡组”）。
   * - "for_scope_default": 领域默认卡组模式。
   *   开头用的是冒号（“:” 或 “：”），相当于此冒号被扩展为 “<根前缀>：<领域默认卡组>”。
   */
  mode: "regular" | "for_scope_default";
  rootPrefix: string;
  /**
   * 紧随决定模式的前缀之后的输入。
   */
  inputAfterPrefix: string;
  scope: Scope | null;
}): ["ok", Command] | ["error", string, any?] | ["ignore"] {
  if (opts.mode === "regular") {
    const parseResult = parseCommand(opts.inputAfterPrefix, {
      rootPrefix: opts.rootPrefix,
    });
    if (parseResult[0] !== "ok") return parseResult;
    const cmd = parseResult[1];

    if (opts.scope || (cmd.type === "plugin" && cmd.payload.type === "概览")) {
      return parseResult;
    }
    return ["ignore"];
  } else {
    if (!opts.scope) return ["ignore"];

    const defaultDeckName = opts.scope?.attr默认卡组;
    if (!defaultDeckName) return ["ignore"];

    return parseDeckCommand(opts.inputAfterPrefix, defaultDeckName, {
      rootPrefix: opts.rootPrefix,
    });
  }
}

function processExecutionResult(
  api: AstralDiceAPI,
  result: ExecutionResult,
  opts: {
    repo: Repo;
    scope: Scope;
    /**
     * 完整的输入，不用于解析，仅用于帮助信息等辅助功能。
     */
    inputFull: string;
    command: Command;
  },
) {
  switch (result[0]) {
    case "ok": {
      const saver = result[2];
      if (saver) {
        for (const deck of saver.decks ?? []) {
          opts.repo.saveDeckData(deck);
        }
        for (const deckName of saver.deleteDecks ?? []) {
          opts.repo.deleteDeck(deckName, opts.scope.name);
        }
        for (const scope of saver.scopes) {
          opts.repo.saveScopeData(scope);
        }
      }
      api.reply(result[1]);
      break;
    }
    case "error":
      api.reply("错误：" + result[1]);
      break;
    case "todo":
      api.reply([
        `TODO: ${result[1] ?? "实现对应功能"}`,
        "",
        "输入：",
        opts.inputFull,
        "解析结果：",
        JSON.stringify(opts.command, null, 2),
      ].join("\n"));
      break;
    default:
      exhaustive(result);
  }
}

{
  const mainPrefix: MainPrefix = v1 as MainPrefix;
  const restText = v2;
  const senderID = v3;

  try {
    main(Lib, {
      pluginName: PLUGIN_NAME,
      mainPrefix,
      restText,
      senderID: new UserID(senderID),
      rootPrefix: DEFAULT_ROOT_PREFIX,
    });
  } catch (e) {
    Lib.reply([
      `${PLUGIN_NAME}插件执行途中抛出！`,
      "输入：",
      mainPrefix + restText,
      "命令发起者：" + senderID,
      (e instanceof Error) ? "错误消息：" + e.message : "抛出的对象并非错误。",
    ].join("\n"));
  }
}
