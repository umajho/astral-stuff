import { Game, State } from "./game.js";
import TEXTS from "./texts.js";

declare const v1: string;
declare const v2: string;

const arg = v1;
const sender = v2;

function main(sender: string, arg: string): string | null {
  if (!Lib.groupChat()) return TEXTS.ONLY_IN_GROUP;

  const storeID = `轮盘赌 GROUP=${Lib.getGroup()}`;

  const game = new Game(loadState(storeID));
  const resp = processArgument(game, arg, sender);
  saveState(storeID, game.state);

  return resp;
}

function processArgument(game: Game, arg: string, sender: string): string {
  if (arg === "重新装弹") return game.reload();
  if (arg === "扣动扳机") return game.fire(sender);

  const g = /装(\d*)弹/.exec(arg)!;
  const n = g[1] ? Number(g[1]) : undefined;
  return game.reload(n);
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
