import { CommandType, localizeCommandType } from "deck-core";

import {
  COMMAND_EXAMPLES,
  COMMAND_USAGES,
  CommandUsage,
  generateCommandUsageText,
} from "./commands/mod.ts";

export function generatePlainTextUsage(
  url: string | null,
  opts: { rootPrefix: string; filtersMut: string[] | null },
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

function generateCommandsSectionOfUsage(
  opts: { rootPrefix: string; filtersMut: string[] | null },
): string {
  const lines = [];
  for (const typ_ in COMMAND_USAGES) {
    const typ = typ_ as CommandType;
    const cmds = COMMAND_USAGES[typ];
    const cmdUsagesOfType = generateCommandUsagesOfType(typ, cmds, opts);
    if (cmdUsagesOfType) {
      lines.push(...[
        // `=== 类型「${localizeCommandType(typ)}」===`,
        // "",
        cmdUsagesOfType,
        "",
      ]);
    }
  }
  lines.splice(lines.length - 1, 1);

  return lines.join("\n");
}

function generateCommandUsagesOfType(
  typ: CommandType,
  cmds: { [name: string]: CommandUsage },
  opts: { rootPrefix: string; filtersMut: string[] | null },
): string {
  const lines = [];
  for (const name in cmds) {
    const fullName = `${localizeCommandType(typ)}::${name}`;
    if (opts.filtersMut) {
      const idxFullNameInfiltersMut = opts.filtersMut.indexOf(fullName);
      if (idxFullNameInfiltersMut < 0) continue;
      opts.filtersMut.splice(idxFullNameInfiltersMut, 1);
    }

    const usage = cmds[name];
    lines.push(...[
      `=== ${fullName} ===`,
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
