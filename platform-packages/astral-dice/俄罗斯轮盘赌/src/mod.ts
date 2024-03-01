import { Game, State } from "russian-roulette-core";
import { TextInputAdapter } from "russian-roulette-adapters";

import TEXTS from "./texts.js";

declare const v1: string;
declare const v2: string;

const arg = v1;
const sender = v2;

function main(senderID: string, arg: string): string | null {
  if (!Lib.groupChat()) return TEXTS.ONLY_IN_GROUP;

  const storeID = `轮盘赌 GROUP=${Lib.getGroup()}`;

  const game = new Game(loadState(storeID), { texts: TEXTS });
  const resp = (new TextInputAdapter(game)).evaluate(arg, { senderID });
  saveState(storeID, game.state);

  return resp;
}

function loadState(storeID: string): State | null {
  const data = "" + Lib.getValue(storeID);
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function saveState(storeID: string, state: State) {
  Lib.setAsSolidValue(storeID);
  Lib.setValue(storeID, JSON.stringify(state));
}

const result = main(sender, arg);
if (result) {
  Lib.reply(result);
}
