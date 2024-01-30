namespace Lib {
  /**
   * 返回是否为群聊。
   */
  function groupChat(): boolean;
  /**
   * 获取群号。
   */
  function getGroup(): String;
  /**
   * 回复。
   */
  function reply(msg: string): string;
  /**
   * 获取变量。
   */
  function getValue(key: string): String;
  /**
   * 持久化 `key` 对应的变量。
   */
  function setAsSolidValue(key: string);
  /**
   * 设置变量。
   */
  function setValue(key: string, value: string);
  /**
   * 目前只能确定把第二个参数设为 “0” 能删除掉变量。
   */
  function setValueExpireTime(key: string, zero: 0);
  /**
   * 获取配置（同一 `auto` 下名为 key 的属性）。
   */
  function getConfig(key: string): String;
}
