import { beforeEach, describe, expect, it } from "vitest";

import { Game } from "./game.js";

describe("Game", () => {
  let game: Game;
  beforeEach(() => {
    game = new Game(null);
  });

  describe("reload", () => {
    for (let n = 1; n <= 6; n++) {
      it(`装 ${n} 弹，有 ${n} 弹`, () => {
        game.reload(n);
        expect(game.totalBullets).toBe(n);
      });
    }
    it.todo("不能装 0 弹");
    it.todo("不能装多于 6 弹");

    it("省略数量时，装弹数与上次相同", () => {
      game.reload(3);
      game.reload();
      expect(game.totalBullets).toBe(3);
    });
  });

  describe("fire", () => {
    it("死人当前轮不能再参与，新一轮可以重新参与", () => {
      game.reload(6);
      game.fire("p1");
      expect(game.remainBullets).toBe(5);
      game.fire("p1");
      expect(game.remainBullets).toBe(5);
      game.fire("p2");
      expect(game.remainBullets).toBe(4);
      game.reload();
      game.fire("p1");
      expect(game.remainBullets).toBe(5);
    });

    it("子弹总数保持不变，子弹用光后自动重新装弹", () => {
      game.reload(6);
      for (let i = 0; i < 5; i++) {
        game.fire(`p${i + 1}`);
        expect(game.remainBullets).toBe(6 - i - 1);
        expect(game.totalBullets).toBe(6);
      }

      game.fire("p6");
      expect(game.remainBullets).toBe(6);
    });

    it("能正确追踪各种数值", () => {
      const game = new Game({
        cylinder: [false, false, true, false, true, true],
        participants: [],
        deadIndices: [],
      });

      const getStats = () => ({
        p: game.totalParticipants,
        dp: game.totalDeadParticipants,
        b: game.remainBullets,
      });

      game.fire("p1");
      expect(getStats()).toEqual({ p: 1, dp: 0, b: 3 });
      game.fire("p1");
      expect(getStats()).toEqual({ p: 1, dp: 0, b: 3 });
      game.fire("p1");
      expect(getStats()).toEqual({ p: 1, dp: 1, b: 2 });
      game.fire("p1"); // 无用
      expect(getStats()).toEqual({ p: 1, dp: 1, b: 2 });
      game.fire("p2");
      expect(getStats()).toEqual({ p: 2, dp: 1, b: 2 });
      game.fire("p3");
      expect(getStats()).toEqual({ p: 3, dp: 2, b: 1 });
    });
  });
});
