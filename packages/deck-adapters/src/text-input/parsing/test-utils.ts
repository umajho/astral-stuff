import { exhaustive } from "ts-utils";

import { DeckName, UserID } from "deck-core";

import { CommandPrefixType } from "./types.ts";

export function generateCommandPrefixEx(
  prefixType: CommandPrefixType,
  opts: {
    rootPrefix: string | null;
    deckName: DeckName;
    handOwner: UserID | null;
  },
) {
  const rootPrefix = opts.rootPrefix ?? "";
  switch (prefixType) {
    case "global":
      return `${rootPrefix}`;
    case "deck":
      return `${rootPrefix}：${opts.deckName} `;
    case "deck_discard_pile":
      return `${rootPrefix}：${opts.deckName} 弃牌堆`;
    case "deck_hand":
      if (opts.handOwner) {
        return `${rootPrefix}：${opts.deckName} 手牌：${opts.handOwner} `;
      } else {
        return `${rootPrefix}：${opts.deckName} 手牌`;
      }
    default:
      exhaustive(prefixType);
  }
}
