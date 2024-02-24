import { CardName, DeckName, UserID } from "../ids.ts";

export interface AttributeSetters {
  [name: string]: string | null;
}

export interface CardNameWithOptionalAmount {
  name: CardName;
  amount: number | null | "all";
}

export interface CardNameWithDescriptionAndOptionalAmount {
  name: CardName;
  amount: number | null;
  description: string;
}

export type CommandType = Command["type"];

export function localizeCommandType(typ: CommandType): string {
  return {
    "plugin": "插件",
    "deck_existence": "卡组存在",
    "deck": "卡组",
    "deck_discard_pile": "卡组弃牌堆",
    "deck_hand": "卡组手牌",
    "between_decks": "卡组之间",
  }[typ];
}

export type Command =
  | {
    type: "plugin";
    payload: PluginCommand;
  }
  | {
    type: "deck_existence";
    deckName: DeckName;
    payload: DeckExistenceCommand;
  }
  | {
    type: "deck";
    deckName: DeckName;
    payload: DeckCommand;
  }
  | {
    type: "deck_discard_pile";
    deckName: DeckName;
    payload: DeckDiscardPileCommand;
  }
  | {
    type: "deck_hand";
    deckName: DeckName;
    userID: UserID | null;
    payload: DeckHandCommand;
  }
  | {
    type: "between_decks";
    subjectDeckName: DeckName;
    objectDeckName: DeckName;
    payload: BetweenDecksCommand;
  };

export type PluginCommand =
  // 信息
  | { type: "概览" }
  | { type: "帮助" }
  | { type: "列表" }
  // 领域设置
  | { type: "领域设置"; attributeSetters: AttributeSetters };

export type DeckExistenceCommand =
  | {
    type: "创建";
    flagSetters: string[];
    attributeSetters: AttributeSetters;
    cards: CardNameWithDescriptionAndOptionalAmount[];
    keepsOrderOfCards: boolean;
  }
  | { type: "销毁" }
  | { type: "导出" }
  | { type: "导入"; mode: "create" | "overwrite"; data: any };

export type DeckCommand =
  // 信息
  | { type: "概览" }
  | { type: "查看"; cards: CardName[] }
  // 设置
  | { type: "设置"; flagSetters: string[]; attributeSetters: AttributeSetters }
  // 抽牌堆
  | { type: "列表" }
  | {
    type: "添加";
    at: "top" | "bottom" | null;
    cards: CardNameWithDescriptionAndOptionalAmount[];
  }
  | { type: "删除"; cards: CardNameWithOptionalAmount[] }
  | { type: "洗牌" }
  | { type: "回收全部并洗牌" }
  // 抽卡
  | {
    type: "抽卡";
    to: "currentPlace" | "senderPrivate";
    amount: number | null;
  }
  | {
    type: "窥视";
    to: "currentPlace" | "senderPrivate";
    amount: number | null;
  };

export type DeckDiscardPileCommand =
  | { type: "列表" }
  | {
    type: "回收";
    at: "top" | "bottom" | null;
    cards: CardNameWithOptionalAmount[];
  }
  | { type: "回收全部并洗牌" }
  | { type: "删除全部" };

export type DeckHandCommand =
  | { type: "列表" }
  | { type: "加入"; cards: CardNameWithOptionalAmount[] }
  | { type: "丢弃"; cards: CardNameWithOptionalAmount[] }
  | { type: "丢弃全部" }
  | {
    type: "回收";
    at: "top" | "bottom" | null;
    cards: CardNameWithOptionalAmount[];
  }
  | { type: "回收全部并洗牌" }
  | { type: "转让至"; receiverID: UserID; cards: CardNameWithOptionalAmount[] };

export type BetweenDecksCommand =
  | { type: "克隆为" }
  | { type: "全部添加至" }
  | { type: "重命名为" }
  | {
    type: "挑选添加至" | "挑选转移至";
    cards: CardNameWithOptionalAmount[];
  };
