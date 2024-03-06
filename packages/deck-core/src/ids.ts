export class UserID {
  constructor(public readonly userID: string) {}
  toString(): string {
    return this.userID;
  }
  equals(other: UserID): boolean {
    return this.userID === other.userID;
  }
}
export class GroupID {
  constructor(public readonly groupID: string) {}
  toString(): string {
    return this.groupID;
  }
  equals(other: GroupID): boolean {
    return this.groupID === other.groupID;
  }
}
export class ScopeID {
  constructor(public readonly scopeID: string) {}
  toString(): string {
    return this.scopeID;
  }
  equals(other: ScopeID): boolean {
    return this.scopeID === other.scopeID;
  }
}
export class DeckName {
  constructor(public readonly deckName: string) {}
  toString(): string {
    return this.deckName;
  }
  equals(other: DeckName): boolean {
    return this.deckName === other.deckName;
  }
}
export class CardName {
  constructor(public readonly cardName: string) {}
  toString(): string {
    return this.cardName;
  }
  equals(other: CardName): boolean {
    return this.cardName === other.cardName;
  }
}
