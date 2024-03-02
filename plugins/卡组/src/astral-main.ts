import { AstralDiceAPI } from "astral-dice-types";

import { exhaustive } from "ts-utils";

import packageJSON from "../package.json" assert { type: "json" };

import { DeckName, GroupID, ScopeID, UserID } from "./ids.ts";
import { ExecutionResult, MainExecutor } from "./main-executor.ts";
import { Scope, Scopes } from "./models/scopes.ts";
import { AstralRepo, Repo } from "./repo.ts";
import {
  Command,
  findCommandUsageHeadsByName,
  parseCommand,
  parseDeckCommand,
} from "./commands/mod.ts";

export type MainPrefix = "卡组" | ":" | "：";

export function main(
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
  const usageURL = ("" + api.getConfig("usage-url")) || null;
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
    new MainExecutor({
      pluginName: opts.pluginName,
      info: packageJSON,
      rootPrefix: opts.rootPrefix,
      usageURL,
      repo,
      scope,
      senderID: opts.senderID,
      mainAdmins,
    });
  const result = executor.execute(cmd);

  processExecutionResult(api, result, {
    rootPrefix: opts.rootPrefix,
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
    rootPrefix: string;
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
    case "error_2": {
      const err = result[1];
      switch (err[0]) {
        case "no_deck":
          result = convertExecutionErrorNoDeck({
            rootPrefix: opts.rootPrefix,
            scopeID: opts.scope.name,
            deckName: err[1].deckName,
          });
          break;
      }
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

function convertExecutionErrorNoDeck(opts: {
  rootPrefix: string;
  scopeID: ScopeID;
  deckName: DeckName;
}): ["error", string] {
  const possibleIntentions: string[] = findCommandUsageHeadsByName(
    "" + opts.deckName,
    { rootPrefix: opts.rootPrefix },
  );

  return [
    "error",
    [
      `领域 “${opts.scopeID}” 当中不存在卡组 “${opts.deckName}”`,
      "",
      `（发送 “${opts.rootPrefix}：${opts.deckName} 创建” 创建该卡组。）`,
      `（发送 “${opts.rootPrefix}帮助 卡组存在::创建” 查询前述命令的用法。）`,
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
