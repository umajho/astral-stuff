import { CommandType, localizeCommandType } from "./commands/types.ts";
import {
  COMMAND_EXAMPLES,
  COMMAND_USAGES,
  CommandUsage,
  generateCommandUsageText,
} from "./commands/usages.ts";

export function generateUsage(
  url: string | null,
  opts: { rootPrefix: string },
): string {
  return [
    "= 用法 =",
    ...(url ? ["网页版：" + url] : []),
    "",
    "== 命令 ==",
    "",
    generateCommandsSectionOfUsage(opts),
  ].join("\n");
}

function generateCommandsSectionOfUsage(opts: { rootPrefix: string }): string {
  const lines = [];
  for (const typ_ in COMMAND_USAGES) {
    const typ = typ_ as CommandType;
    const cmds = COMMAND_USAGES[typ];
    lines.push(...[
      `=== 类型「${localizeCommandType(typ)}」===`,
      "",
      generateCommandUsagesOfType(typ, cmds, opts),
      "",
    ]);
  }
  lines.splice(lines.length - 1, 1);

  return lines.join("\n");
}

function generateCommandUsagesOfType(
  typ: CommandType,
  cmds: { [name: string]: CommandUsage },
  opts: { rootPrefix: string },
): string {
  const lines = [];
  for (const name in cmds) {
    const usage = cmds[name];
    lines.push(...[
      `==== 命令「${name}」====`,
      generateCommandUsage(typ, name, usage, opts),
      "",
    ]);
  }
  lines.splice(lines.length - 1, 1);

  return lines.join("\n");
}

function generateCommandUsage(
  typ: CommandType,
  name: string,
  usage: CommandUsage,
  opts: { rootPrefix: string },
): string {
  // @ts-ignore
  const examples = COMMAND_EXAMPLES[typ][name] as string[];
  return generateCommandUsageText(name, usage, examples, opts);
}
