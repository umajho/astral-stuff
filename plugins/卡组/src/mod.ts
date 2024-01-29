import "astral-dice-types";

import packageJSON from "../package.json" assert { type: "json" };

import { parseCommand } from "./commands/parsing.ts";

declare const v1: string, v2: string, v3: string;

type MainPrefix = "卡组" | ":" | "：";

const mainPrefix: MainPrefix = v1 as MainPrefix;
const restText = v2;
const senderID = v3;

function main(mainPrefix: MainPrefix, restText: string, _senderID: string) {
  if (mainPrefix !== "卡组") throw new Error("unimplemented");

  const result = parseCommand(restText, { rootPrefix: "卡组" });
  if (result[0] === "ignore") return;
  if (result[0] === "error") {
    Lib.reply("错误：\n" + result[1]);
    return;
  }

  const cmd = result[1];
  switch (cmd.type) {
    case "plugin": {
      switch (cmd.payload.type) {
        case "": {
          Lib.reply([
            "= 列表插件 =",
            "版本：" + packageJSON.version,
            "主页：" + packageJSON.homepage,
            "",
            "通过 “卡组帮助” 获取帮助信息。",
          ].join("\n"));
          return;
        }
      }
    }
  }

  Lib.reply([
    "TODO: 实现对应功能。",
    "",
    "输入：",
    mainPrefix + restText,
    "解析结果：",
    JSON.stringify(result, null, 2),
  ].join("\n"));
}

main(mainPrefix, restText, senderID);
