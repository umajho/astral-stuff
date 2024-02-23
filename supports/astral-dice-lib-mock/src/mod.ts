import { AstralDiceAPI } from "astral-dice-types";

export type Place =
  | [type: "group", id: string]
  | [type: "private", id: string];

export function placeToString(place: Place): string {
  switch (place[0]) {
    case "group":
      return `群组 ${place[1]}`;
    case "private":
      return `私聊 ${place[1]}`;
  }
}

export class MockRuntime {
  private store: { [key: string]: string } = {};

  private _place: Place;
  get place() {
    return this._place;
  }

  constructor(
    private readonly configs: { [key: string]: string },
    place: Place,
  ) {
    this._place = place;
  }

  useLib(cb: (lib: AstralDiceAPI) => void) {
    MockLib.use({ runtime: this, place: this.place }, cb);
  }

  changePlace(place: Place) {
    this._place = place;
  }

  __sendMessage(place: Place, msg: string): void {
    console.log(msg);
  }
  __getValue(key: string): string | undefined {
    return this.store[key];
  }
  __setValue(key: string, value: string) {
    this.store[key] = value;
  }
  __deleteValue(key: string) {
    delete this.store[key];
  }
  __getConfig(key: string): string | undefined {
    return this.configs[key];
  }
}

interface NewMockLibOptions {
  runtime: MockRuntime;
  place: Place;
}

class MockLib implements AstralDiceAPI {
  private store: { [key: string]: string } = {};
  private persistentValueNames: string[] = [];

  private constructor(
    private readonly options: NewMockLibOptions,
  ) {}
  private dispose() {
    for (const key of this.persistentValueNames) {
      if (!(key in this.store)) continue;
      this.runtime.__setValue(key, this.store[key]);
    }
  }
  static use(opts: NewMockLibOptions, cb: (lib: MockLib) => void) {
    const lib = new MockLib(opts);
    cb(lib);
    lib.dispose();
  }

  get place() {
    return this.options.place;
  }
  get runtime() {
    return this.options.runtime;
  }

  groupChat(): boolean {
    return this.place[0] === "group";
  }
  getGroup(): String {
    if (this.place[0] !== "group") return new String();
    return new String(this.place[1]);
  }
  reply(msg: string): void {
    this.runtime.__sendMessage(this.place, msg);
  }
  getValue(key: string): String {
    let value: string | undefined;
    if (key in this.store) {
      value = this.store[key];
    } else {
      value = this.runtime.__getValue(key);
    }
    return new String(value ?? "");
  }
  setAsSolidValue(key: string): void {
    this.persistentValueNames.push(key);
  }
  setValue(key: string, value: string): void {
    this.store[key] = value;
  }
  setValueExpireTime(key: string, zero: 0): void {
    if (!zero) throw new Error("unimplemented");
    this.runtime.__deleteValue(key);
  }
  getConfig(key: string): String {
    return new String(this.runtime.__getConfig(key) ?? "");
  }
}
