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
  attributes: { [Name in ScopeAttributeName]?: string };
  /**
   * XXX: 为了能让 DeckAttributes 正确运作，修改某个卡组的数据时不应替换整个
   * DeckInScopeData。
   */
  decks: { [name: string]: DeckInScopeData };
}

export interface DeckInScopeData {
  description: string | null;
}

export function makeEmptyScopeData(): ScopeData {
  return { attributes: {}, decks: {} };
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

    if (rawValue !== null) {
      this.data.attributes[name] = rawValue;
    } else {
      delete this.data.attributes[name];
    }

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
    return SCOPE_ATTRIBUTE_NAMES.map((name) => {
      const hasBeenSet = !!this.data.attributes[name];
      const value = this.getAttributeText(name);
      return (hasBeenSet ? "" : "（默认）") +
        (!!value ? "" : "（空值）") +
        `${name} ${value}`;
    }).join("\n");
  }

  isAdmin(id: UserID): boolean {
    if (this.isMainAdmin(id)) return true;
    return this.attr管理员.some((u) => u.equals(id));
  }

  isMainAdmin(id: UserID): boolean {
    return this.mainAdmins.some((u) => u.equals(id));
  }

  get decks(): { [name: string]: DeckInScope } {
    const decks: { [name: string]: DeckInScope } = {};
    for (const name in this.data.decks) {
      decks[name] = new DeckInScope(this.data.decks[name]);
    }
    return decks;
  }

  getDeckByName(name: DeckName): DeckInScope | null {
    const deck = this.data.decks["" + name];
    return deck ? new DeckInScope(deck) : null;
  }

  declareDeck(
    name: DeckName,
  ): ["ok"] | ["error", string] {
    if (/\s/.test("" + name)) return ["error", "卡组名中不能含有空白"];
    if (("" + name) in this.data.decks) {
      return ["error", `名为 “${name}” 的卡组已经存在`];
    }
    this.data.decks["" + name] = {
      description: null,
    };
    // TODO: sort?
    return ["ok"];
  }
  updateDeckOptions(
    name: DeckName,
    opts: { description?: string | null },
  ): ["ok"] {
    const deck = this.getDeckByName(name)!;
    if (opts.description !== undefined) {
      deck.description = opts.description;
    }
    return ["ok"];
  }
  revokeDeck(name: DeckName): ["ok"] | ["error", string] {
    if (!(("" + name) in this.data.decks)) {
      return ["error", `不存在名为 “${name}” 的卡组`];
    }
    delete this.data.decks["" + name];
    return ["ok"];
  }
}

export class DeckInScope {
  constructor(
    private readonly data: DeckInScopeData,
  ) {}

  get description() {
    return this.data.description;
  }
  set description(value: string | null) {
    this.data.description = value;
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
