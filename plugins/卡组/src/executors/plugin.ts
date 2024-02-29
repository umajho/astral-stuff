import { ExecutionResult } from "../main-executor.ts";
import { PluginCommand } from "../commands/mod.ts";
import { Scope } from "../models/scopes.ts";
import { generateUsage } from "../usage.ts";
import { UserID } from "../ids.ts";
import { exhaustive } from "../ts-utils.ts";

export class PluginCommandExecutor {
  constructor(
    private readonly scope: Scope,
    private readonly senderID: UserID,
    private readonly opts: {
      rootPrefix: string;
      usageURL: string | null;
    },
  ) {}

  execute(cmd: Exclude<PluginCommand, { type: "概览" }>): ExecutionResult {
    switch (cmd.type) {
      case "帮助":
        return this.execute帮助(cmd);
      case "列表":
        return this.execute列表(cmd);
      case "领域设置":
        return this.execute领域设置(cmd);
      default:
        exhaustive(cmd);
    }
  }

  private execute帮助(cmd: PluginCommand & { type: "帮助" }): ExecutionResult {
    const filters = cmd.filters && [...cmd.filters];
    const usage = generateUsage(this.opts.usageURL, {
      rootPrefix: this.opts.rootPrefix,
      filtersMut: filters,
    });
    if (filters?.length) {
      return ["error", "未知帮助条目：\n" + filters.join("\n")];
    }
    return ["ok", usage, null];
  }

  private execute列表(_cmd: PluginCommand & { type: "列表" }): ExecutionResult {
    const decks = this.scope.decks;
    return [
      "ok",
      `领域 “${this.scope.name}” 现有卡组（共 ${decks.length} 套）：\n` +
      decks.map((d) => `${"" + d.name}：${d.description}`).join("\n"),
      null,
    ];
  }

  private execute领域设置(
    cmd: PluginCommand & { type: "领域设置" },
  ): ExecutionResult {
    const seenNames: string[] = [];
    for (const name in cmd.attributeSetters) {
      if (seenNames.indexOf(name) >= 0) {
        return [
          "error",
          `同一次设置中，同样的属性名只能出现一次，而 “${name}” 出现了多次`,
        ];
      }
      seenNames.push(name);
      const value = cmd.attributeSetters[name];
      const result = this.scope.setAttributeText(name, value, this.senderID);
      if (result[0] === "error") {
        return result;
      }
    }
    return [
      "ok",
      `成功更新领域 “${this.scope.name.scopeID}” 的设置。当前属性：\n` +
      this.scope.generateAttributesText(),
      { scopes: [this.scope] },
    ];
  }
}
