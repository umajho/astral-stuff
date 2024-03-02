import { main, MainPrefix } from "./astral-main.ts";
import { DEFAULT_ROOT_PREFIX, PLUGIN_NAME } from "./consts.ts";
import { UserID } from "./ids.ts";

declare const v1: string, v2: string, v3: string;

{
  const mainPrefix: MainPrefix = v1 as MainPrefix;
  const restText = v2;
  const senderID = v3;

  try {
    main(Lib, {
      pluginName: PLUGIN_NAME,
      mainPrefix,
      restText,
      senderID: new UserID(senderID),
      rootPrefix: DEFAULT_ROOT_PREFIX,
    });
  } catch (e) {
    Lib.reply([
      `${PLUGIN_NAME}插件执行途中抛出！`,
      "输入：",
      mainPrefix + restText,
      "命令发起者：" + senderID,
      (e instanceof Error) ? "错误消息：" + e.message : "抛出的对象并非错误。",
    ].join("\n"));
  }
}
