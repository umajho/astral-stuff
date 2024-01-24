import TEXTS from "./texts.js";

const DEFAULT_BULLETS = 1;
const CYLINDER_CAPACITY = 6;

export interface State {
  cylinder: boolean[];
  participants: string[];
  deadIndices: number[];
}

export class Game {
  private _state: State;
  get state(): State {
    return this._state;
  }

  constructor(state: State | null) {
    if (state) {
      this._state = state;
    } else {
      this._state = //
        Game.newStateWithCylinder(Game.createCylinder(DEFAULT_BULLETS));
    }
  }

  reload(n?: number): string {
    if (n === undefined) {
      n = this.totalBullets;
    }

    if (!n) return TEXTS.BULLETS_0;
    if (n > CYLINDER_CAPACITY) return TEXTS.BULLETS_TOO_MANY;

    this._state = Game.newStateWithCylinder(Game.createCylinder(n));
    return n === CYLINDER_CAPACITY
      ? TEXTS.BULLETS_FULL
      : TEXTS.RELOADED.replace("{bullets}", n.toString());
  }

  fire(sender: string): string {
    for (const idx of this._state.deadIndices) {
      if (this._state.participants[idx] === sender) return TEXTS.ALREADY_DEAD;
    }

    let msg: string;
    const chamber = this._state.cylinder.splice(0, 1)[0];
    const pIdx = this.lookupParticipant(sender);
    if (chamber) {
      this._state.deadIndices.push(pIdx);
      msg = TEXTS.DEAD;
    } else {
      msg = TEXTS.ALIVE;
    }

    msg += "\n" + [
      ["参与者数", this.totalParticipants],
      ["淘汰数", this.totalDeadParticipants],
      ["扣动扳机次数", CYLINDER_CAPACITY - this._state.cylinder.length],
      ["剩余子弹数", this.remainBullets],
    ].map((pair) => pair.join("：")).join("；") + "。";

    if (!this.remainBullets) {
      this._state = //
        Game.newStateWithCylinder(Game.createCylinder(this.totalBullets));
      msg += "\n\n" +
        TEXTS.NEXT_GAME.replace("{bullets}", this.totalBullets.toString());
    }

    return msg;
  }

  private lookupParticipant(p: string): number {
    const idx = this._state.participants.indexOf(p);
    if (idx >= 0) return idx;
    this._state.participants.push(p);
    return this._state.participants.length - 1;
  }

  get totalParticipants(): number {
    return this._state.participants.length;
  }

  get totalDeadParticipants(): number {
    return this._state.deadIndices.length;
  }

  get remainBullets(): number {
    return this._state.cylinder.filter((x) => x).length;
  }

  get totalBullets(): number {
    return this._state.deadIndices.length + this.remainBullets;
  }

  private static newStateWithCylinder(cylinder: boolean[]): State {
    return {
      cylinder,
      participants: [],
      deadIndices: [],
    };
  }

  private static createCylinder(n: number): boolean[] {
    /**
     * see: https://stackoverflow.com/a/12646864
     */
    function shuffle<T>(arr: T[]) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }

    const cylinder: boolean[] = [];
    for (let i = 0; i < CYLINDER_CAPACITY; i++) {
      cylinder.push(i < n);
    }

    shuffle(cylinder);

    return cylinder;
  }
}
