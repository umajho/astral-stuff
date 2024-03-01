import type { Game } from "russian-roulette-core";

export class TextInputAdapter {
  constructor(private readonly game: Game) {}

  evaluate(input: string, opts: { senderID: string }): string {
    if (input === "重新装弹") return this.game.reload();
    if (input === "扣动扳机") return this.game.fire(opts.senderID);

    const g = /装(\d*)弹/.exec(input)!;
    const n = g[1] ? Number(g[1]) : undefined;
    return this.game.reload(n);
  }
}
