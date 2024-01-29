import { exhaustive } from "../ts-utils.ts";

import { DeckName, UserID } from "../ids.ts";

import { CommandPrefixType } from "./usages.ts";

export function generateCommandPrefixEx(
  prefixType: CommandPrefixType,
  opts: {
    rootPrefix: string | null;
    deckName: DeckName;
    handOwner: UserID | null;
  },
) {
  const rootPrefix = opts.rootPrefix ?? "";
  const deckName = opts.deckName.deckName;
  const handOwnerID = opts.handOwner?.userID;
  switch (prefixType) {
    case "global":
      return `${rootPrefix}`;
    case "deck":
      return `${rootPrefix}：${deckName} `;
    case "deck_discard_pile":
      return `${rootPrefix}：${deckName} 弃牌堆`;
    case "deck_hand":
      if (handOwnerID) {
        return `${rootPrefix}：${deckName} 手牌：${handOwnerID} `;
      } else {
        return `${rootPrefix}：${deckName} 手牌`;
      }
    default:
      exhaustive(prefixType);
  }
}
