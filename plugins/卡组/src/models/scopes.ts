import { DeckName, GroupID, ScopeID, UserID } from "../ids.ts";
import { Repo } from "../repo.ts";

const SCOPE_ATTRIBUTE_NAMES = ["管理员", "默认卡组", "卡组卡牌上限"] as const;
export type ScopeAttributeName = (typeof SCOPE_ATTRIBUTE_NAMES)[number];
const SCOPE_ATTRIBUTE_DEFAULTS = {
  "管理员": "[]",
  "默认卡组": "",
  "卡组卡牌上限": "200",
} satisfies { [Name in ScopeAttributeName]: string };

export interface ScopeData {
  attributes: { [Name in ScopeAttributeName]?: string | null };
  decks: string[];
}

export function makeEmptyScopeData(): ScopeData {
  return { attributes: {}, decks: [] };
}

export class Scope {
  constructor(
    public readonly name: ScopeID,
    public readonly groups: GroupID[],
    private readonly data: ScopeData,
    private readonly mainAdmins: UserID[],
  ) {}

  asData(): ScopeData {
    return this.data;
  }

  private getAttributeText(name: ScopeAttributeName): string {
    return (this.data.attributes[name] ?? SCOPE_ATTRIBUTE_DEFAULTS[name]);
  }

  setAttributeText(
    name_: string,
    rawValue: string | null,
    sender: UserID,
  ): ["ok"] | ["error", string] {
    rawValue = rawValue?.trim() || null;

    if (!this.isAdmin(sender)) {
      return ["error", "只有管理员可以改变领域的属性"];
    }

    if ((SCOPE_ATTRIBUTE_NAMES as readonly string[]).indexOf(name_) < 0) {
      return ["error", `未知领域属性 “${name_}”`];
    }
    const name = name_ as ScopeAttributeName;

    if (name === "管理员" && !this.isMainAdmin(sender)) {
      return ["error", "领域属性 “管理员” 的值只能由主管理员修改"];
    }

    this.data.attributes[name] = rawValue;

    return ["ok"];
  }

  setAttributeTextInternal(
    name: ScopeAttributeName,
    rawValue: string | null,
    sender: UserID,
  ): ["ok"] | ["error", string] {
    return this.setAttributeText(name, rawValue, sender);
  }

  get attr管理员(): UserID[] {
    const json = this.getAttributeText("管理员") || "[]";
    try {
      const ids = (JSON.parse(json) as string[]).map((a) => new UserID(a));
      return ids;
    } catch (e) {
      throw new Error(
        "解析领域属性中指定的管理员失败：" +
          (e as Error).message +
          "\n（请联系主管理员修正领域属性 “管理员” 的值，对主管理员的判定先于对属性值的解析。）",
      );
    }
  }

  get attr默认卡组(): DeckName | null {
    const name = this.getAttributeText("默认卡组");
    return name ? new DeckName(name) : null;
  }

  get attr卡组卡牌上限(): number {
    return Number(this.getAttributeText("卡组卡牌上限")!);
  }

  generateAttributesText(): string {
    return SCOPE_ATTRIBUTE_NAMES.map((name) =>
      (this.data.attributes[name] ? "" : "（默认）") +
      `${name} ${this.getAttributeText(name)}`
    ).join("\n");
  }

  isAdmin(id: UserID): boolean {
    if (this.isMainAdmin(id)) return true;
    return this.attr管理员.some((u) => u.equals(id));
  }

  isMainAdmin(id: UserID): boolean {
    return this.mainAdmins.some((u) => u.equals(id));
  }

  get decks(): DeckName[] {
    return this.data.decks.map((d) => new DeckName(d));
  }

  declareDeck(name: DeckName): ["ok"] | ["error", string] {
    if (/\s/.test("" + name)) return ["error", "卡组名中不能含有空白"];
    if (this.data.decks.some((d) => d === "" + name)) {
      return ["error", `名为 “${name}” 的卡组已经存在`];
    }
    this.data.decks.push("" + name);
    this.data.decks.sort();
    return ["ok"];
  }
  revokeDeck(name: DeckName): ["ok"] | ["error", string] {
    const idx = this.data.decks.indexOf("" + name);
    if (idx < 0) {
      return ["error", `不存在名为 “${name}” 的卡组`];
    }
    this.data.decks.splice(idx, 1);
    return ["ok"];
  }
}

export interface ScopesData {
  [name: string]: string[];
}

export class Scopes {
  constructor(
    private readonly data: ScopesData,
    private readonly admins: UserID[],
  ) {}

  getScopeByGroup(
    repo: Pick<Repo, "loadScopeData">,
    groupID: GroupID,
  ): Scope | null {
    for (const name in this.data) {
      const scopeGroupsData = this.data[name];
      const scopeID = new ScopeID(name);
      const groups = scopeGroupsData.map((g) => new GroupID(String(g)));

      if (groups.some((g) => g.equals(groupID))) {
        const result = repo.loadScopeData(scopeID);
        if (result[0] === "error") throw new Error(result[1]);
        const scopeData = result[1] ?? makeEmptyScopeData();
        return new Scope(scopeID, groups, scopeData, this.admins);
      }
    }

    return null;
  }
}
