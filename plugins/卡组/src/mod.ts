import "astral-dice-types";

import packageJSON from "../package.json" assert { type: "json" };

import { PLUGIN_NAME } from "./consts.ts";
import { UserID } from "./ids.ts";
import { MainExecutor, MainPrefix } from "./main-executor.ts";

declare const v1: string, v2: string, v3: string;

const mainPrefix: MainPrefix = v1 as MainPrefix;
const restText = v2;
const senderID = v3;

function main(mainPrefix: MainPrefix, restText: string, senderID_: string) {
  const senderID = new UserID(senderID_);

  const executor = //
    new MainExecutor(Lib, packageJSON, mainPrefix, restText, senderID);
  executor.execute();
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
