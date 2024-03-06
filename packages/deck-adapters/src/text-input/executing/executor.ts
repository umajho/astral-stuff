import { CommandExecutor, DeckName, ExecutionResult } from "deck-core";

import { TextInputCommand } from "../parsing/mod.ts";
import { generatePlainTextUsage } from "../usage/mod.ts";
import { findCommandUsageHeadsByName } from "../usage/commands/mod.ts";
import { exhaustive } from "ts-utils";

export class TextInputCommandExecutor {
  private readonly rootPrefix: string;
  private readonly usageURL: string | null;

  constructor(
    private readonly commandExecutor: CommandExecutor,
    opts: { usageURL: string | null; rootPrefix: string },
  ) {
    this.rootPrefix = opts.rootPrefix;
    this.usageURL = opts.usageURL;
  }

  execute(cmd: TextInputCommand): Exclude<ExecutionResult, { 0: "error_2" }> {
    let result: ExecutionResult;
    if (cmd.type === "x_text") {
      result = this.generateHelpMessage(cmd.payload.filters);
    } else {
      result = this.commandExecutor.execute(cmd);
    }
    if (result[0] === "error_2") return this.convertError(result);
    return result;
  }

  private generateHelpMessage(filters: string[] | null): ExecutionResult {
    filters = filters && [...filters];
    const usage = generatePlainTextUsage(this.usageURL, {
      rootPrefix: this.rootPrefix,
      filtersMut: filters,
    });
    if (filters?.length) {
      return ["error", "未知帮助条目：\n" + filters.join("\n")];
    }
    return ["ok", usage, null];
  }

  private convertError(
    resultErr: Extract<ExecutionResult, { 0: "error_2" }>,
  ): ["error", string] {
    const err = resultErr[1];
    switch (err[0]) {
      case "no_deck":
        return this.convertErrorNoDeck({ deckName: err[1].deckName });
      default:
        exhaustive(err[0]);
    }
  }

  private convertErrorNoDeck(opts: { deckName: DeckName }): ["error", string] {
    const possibleIntentions: string[] = findCommandUsageHeadsByName(
      "" + opts.deckName,
      { rootPrefix: this.rootPrefix },
    );

    return [
      "error",
      [
        `不存在卡组 “${opts.deckName}”`,
        "",
        `（发送 “${this.rootPrefix}：${opts.deckName} 创建” 创建该卡组。）`,
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
