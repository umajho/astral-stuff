import { exhaustive } from "ts-utils";

import { ExecutionResult } from "../command-executor.ts";
import { PluginCommand } from "../commands/types.ts";
import { Scope } from "../models/scopes.ts";
import { UserID } from "../ids.ts";

export class PluginCommandExecutor {
  constructor(
    private readonly scope: Scope,
    private readonly senderID: UserID,
    private readonly opts: {
      pluginName: string;
      rootPrefix: string;
      info: { version: string; homepage: string };
      usageURL: string | null;
      mainAdmins: UserID[];
    },
  ) {}

  execute(cmd: PluginCommand): ExecutionResult {
    switch (cmd.type) {
      case "概览":
        return this.execute概览(cmd);
      case "列表":
        return this.execute列表(cmd);
      case "领域设置":
        return this.execute领域设置(cmd);
      default:
        exhaustive(cmd);
    }
  }

  private execute概览(cmd: PluginCommand & { type: "概览" }): ExecutionResult {
    const text = generatePluginInfoText(this.opts.info, {
      pluginName: this.opts.pluginName,
      mainAdmins: this.opts.mainAdmins,
      scope: this.scope,
    });

    return ["ok", text, null];
  }

  private execute列表(_cmd: PluginCommand & { type: "列表" }): ExecutionResult {
    const decks = this.scope.decks;
    const lines: string[] = [];
    for (const name in decks) {
      const data = decks[name]!;
      lines.push(`${"" + name}：${data.description}`);
    }
    return [
      "ok",
      `领域 “${this.scope.name}” 现有卡组（共 ${decks.length} 套）：\n` +
      lines.join("\n"),
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

function generatePluginInfoText(
  info: { version: string; homepage: string },
  opts: {
    pluginName: string;
    mainAdmins: UserID[];
    scope: Scope | null;
  },
): string {
  const lines = [
    `= ${opts.pluginName}插件 =`,
    "版本：" + info.version,
    "主页：" + info.homepage,
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
