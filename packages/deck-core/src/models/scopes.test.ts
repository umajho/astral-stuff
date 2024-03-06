import { describe, expect, it } from "vitest";

import { makeEmptyScopeData, Scope, Scopes } from "./scopes.ts";
import { GroupID, ScopeID, UserID } from "../ids.ts";
import { Repo } from "../repo.ts";

const emptyScopeMockRepo: Pick<Repo, "loadScopeData"> = {
  loadScopeData: () => ["ok", makeEmptyScopeData()],
};

describe("Scopes", () => {
  it("能通过群组 ID 得到对应的领域", () => {
    const input = `{ "test": ["123", "456"] }`;
    const scopes = new Scopes(JSON.parse(input), []);
    expect(scopes.getScopeByGroup(emptyScopeMockRepo, new GroupID("123"))?.name)
      .toEqual(new ScopeID("test"));
  });
});

const alice = new UserID("Alice");
const bob = new UserID("Bob");

function makeScope(opts?: { mainAdmins?: UserID[] }): Scope {
  const name = new ScopeID("S");
  const groups: GroupID[] = [];
  const mainAdmins = opts?.mainAdmins ?? [alice];
  return new Scope(name, groups, makeEmptyScopeData(), mainAdmins);
}

describe("Scope", () => {
  it("可以获取到默认值", () => {
    const scope = makeScope();
    const maxCardsPerDeck = scope.attr卡组卡牌上限;
    expect(Number.isInteger(maxCardsPerDeck)).toBeTruthy();
  });

  function doChangeAttribute(scope: Scope, sender: UserID, expectsOk: boolean) {
    const maxCardsPerDeck = scope.attr卡组卡牌上限;
    const nextVal = maxCardsPerDeck + 1;
    const result = //
      scope.setAttributeText("卡组卡牌上限", "" + nextVal, sender);
    if (expectsOk) {
      expect(result).toEqual(["ok"]);
      expect(scope.attr卡组卡牌上限).toBe(maxCardsPerDeck + 1);
    } else {
      expect(result[0]).toBe("error");
    }
  }

  it("管理员可以改变属性", () => {
    const scope = makeScope();
    doChangeAttribute(scope, alice, true);
  });

  it("非管理员不可以改变属性", () => {
    const scope = makeScope();
    doChangeAttribute(scope, bob, false);
  });

  function doSetAttrAdmin(
    scope: Scope,
    sender: UserID,
    newAdminsText: string,
    expectsOk: boolean,
  ) {
    const result = scope.setAttributeText("管理员", newAdminsText, sender);
    expect(result[0]).toBe(expectsOk ? "ok" : "error");
  }

  it("主管理员可以设定领域属性 “管理员”，后者可以改变一般的属性", () => {
    const scope = makeScope();
    doSetAttrAdmin(scope, alice, `["Bob"]`, true);
    doChangeAttribute(scope, bob, true);
  });

  it("在领域属性 “管理员” 中设定的管理员不可以改变领域属性 “管理员”", () => {
    const scope = makeScope();
    doSetAttrAdmin(scope, alice, `["Bob"]`, true);
    doSetAttrAdmin(scope, bob, `["Bob"]`, false);
  });

  it("如果领域属性 “管理员” 有问题，主管理员依旧不受影响", () => {
    const scope = makeScope();
    doSetAttrAdmin(scope, alice, `!!!BAD!!!`, true);
    doChangeAttribute(scope, alice, true);
    expect(() => doChangeAttribute(scope, bob, false)).toThrowError();
    doSetAttrAdmin(scope, alice, `["Bob"]`, true);
    doChangeAttribute(scope, bob, true);
  });
});
