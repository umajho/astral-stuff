import { AstralDiceAPI } from "astral-dice-types";

import { exhaustive } from "ts-utils";

import {
  CommandExecutor,
  ExecutionResult,
  GroupID,
  Repo,
  Scope,
  Scopes,
  UserID,
} from "deck-core";
import {
  CommandParseResult,
  parseTextInputForDeck,
  parseTextInputRegular,
  TextInputCommandExecutor,
} from "deck-adapters";

import packageJSON from "../package.json" assert { type: "json" };

import { AstralRepo } from "./repo.ts";
import { TextInputCommand } from "deck-adapters/src/text-input/parsing/mod.ts";

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

  let parseResult: CommandParseResult;
  if (opts.mainPrefix === opts.rootPrefix) {
    parseResult = parseTextInputRegular(opts.restText, {
      rootPrefix: opts.rootPrefix,
    });
    if (parseResult[0] === "ok" && !scope) {
      const cmd = parseResult[1];
      if (!(cmd.type === "plugin" && cmd.payload.type === "概览")) {
        parseResult = ["ignore"];
      }
    }
  } else {
    if (scope?.attr默认卡组) {
      parseResult = parseTextInputForDeck(opts.restText, {
        rootPrefix: opts.rootPrefix,
        deckName: scope.attr默认卡组,
      });
    } else {
      parseResult = ["ignore"];
    }
  }

  if (parseResult[0] === "ignore") return;
  if (parseResult[0] === "error") {
    api.reply("错误：\n" + parseResult[1]);
    return;
  }
  const cmd = parseResult[1];

  if (!scope) throw new Error("unreachable");

  const executor = new TextInputCommandExecutor(
    new CommandExecutor({
      pluginName: opts.pluginName,
      info: packageJSON,
      rootPrefix: opts.rootPrefix,
      usageURL,
      repo,
      scope,
      senderID: opts.senderID,
      mainAdmins,
    }),
    {
      usageURL,
      rootPrefix: opts.rootPrefix,
    },
  );
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

function processExecutionResult(
  api: AstralDiceAPI,
  result: Exclude<ExecutionResult, { 0: "error_2" }>,
  opts: {
    rootPrefix: string;
    repo: Repo;
    scope: Scope;
    /**
     * 完整的输入，不用于解析，仅用于帮助信息等辅助功能。
     */
    inputFull: string;
    command: TextInputCommand;
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
