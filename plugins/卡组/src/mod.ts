import packageJSON from "../package.json" assert { type: "json" };

import { DEFAULT_ROOT_PREFIX, PLUGIN_NAME } from "./consts.ts";
import { UserID } from "./ids.ts";
import { MainExecutor } from "./main-executor.ts";

type MainPrefix = "卡组" | ":" | "：";

declare const v1: string, v2: string, v3: string;

const mainPrefix: MainPrefix = v1 as MainPrefix;
const restText = v2;
const senderID = v3;

function main(mainPrefix: MainPrefix, restText: string, senderID_: string) {
  const senderID = new UserID(senderID_);

  const rootPrefix = DEFAULT_ROOT_PREFIX;

  const executor = //
    new MainExecutor(Lib, {
      info: packageJSON,
      rootPrefix,
      mode: mainPrefix === rootPrefix ? "regular" : "for_scope_default",
      inputFull: mainPrefix + restText,
      inputAfterPrefix: restText,
      senderID,
    });
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
