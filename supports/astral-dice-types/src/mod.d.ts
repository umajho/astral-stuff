interface AstralDiceAPI {
  /**
   * 返回是否为群聊。
   */
  groupChat(): boolean;
  /**
   * 获取群号。
   */
  getGroup(): String;
  /**
   * 回复。
   */
  reply(msg: string): string;
  /**
   * 获取变量。
   */
  getValue(key: string): String;
  /**
   * 持久化 `key` 对应的变量。
   */
  setAsSolidValue(key: string): void;
  /**
   * 设置变量。
   */
  setValue(key: string, value: string): void;
  /**
   * 目前只能确定把第二个参数设为 “0” 能删除掉变量。
   */
  setValueExpireTime(key: string, zero: 0): void;
  /**
   * 获取配置（同一 `auto` 下名为 key 的属性）。
   */
  getConfig(key: string): String;
}

declare const Lib: AstralDiceAPI;
