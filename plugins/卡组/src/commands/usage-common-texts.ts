export const FORMAT_FLAG_SETTER_ANY = "((+|-)<旗帜名>)*";
export const FORMAT_ATTRIBUTE_SETTER_ANY = "(\n<属性名> <属性值>?)*";
export const FORMAT_NEW_CARDS = "<新卡牌>+";

export const SUFFIXES_AT = ["", "于顶部", "于底部"];

export const DESCRIPTION_FORMAT_NEW_CARD = [
  [
    "“<新卡牌>” 指 “((<数量>#)?<卡名>)<被包围的描述>”。",
    "卡名中不能含有空白字符。",
    "卡名中若要包含 “「」『』【】#\\” 这些符号，",
    "需要在对应符号前添加 “\\”， 比如 “\\「”。",
  ].join(""),
  [
    "“<被包围的描述>” 指 “「<描述>」”“『<描述>』” 或 “【<描述>】”。",
    "除用于消除歧义外，上述用于包围描述的符号之间的语义并无区别。",
  ].join(""),
  [
    "“<被包围的描述>” 中作为包围符号的两侧，",
    "只要每侧数目相同，且符号为同一种，则每侧的符号数目可以不止一个。",
    "比如，“【【【<描述>】】】” 相当于 “【<描述>】”。",
  ].join(""),
].join("\n");

export const DESCRIPTION_SUFFIX_AT = [
  "若指定位置，卡牌会按照列举的顺序插入该位置；",
  "若未指定位置，卡牌会按照随机顺序插入随机位置（包括顶部和底部）。",
].join("");

export const DESCRIPTION_AMOUNT_BEFORE_CARD_NAME_OMISSION =
  "若卡名前不带数量，数量将视为 1。";

export const DESCRIPTION_AMOUNT_BEFORE_CARD_NAME_STRICT = [
  DESCRIPTION_AMOUNT_BEFORE_CARD_NAME_OMISSION,
  "若卡名前数量为全部，需保证对应卡牌全部处于抽牌堆中，否则报错。",
].join("");

export const DESCRIPTION_SUFFIX_TO_PRIVATE =
  "若存在 “至私聊”，本次命令执行的具体结果将仅私聊发送给命令发起者。";
