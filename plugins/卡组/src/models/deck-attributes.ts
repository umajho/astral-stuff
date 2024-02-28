const DECK_ATTRIBUTE_NAMES = ["描述" /*TODO: `, "日志输出群"`*/] as const;
export type DeckAttributeName = (typeof DECK_ATTRIBUTE_NAMES)[number];

export type DeckAttributes = { [Name in DeckAttributeName]?: string };

/**
 * TODO: 像 `Scope` 那边那样允许有空白以外的默认值。
 */
export function generateDeckAttributesText(attributes: DeckAttributes): string {
  // 取自 `Scope::generateAttributesText`。
  return DECK_ATTRIBUTE_NAMES.map((name) => {
    const hasBeenSet = !!attributes[name];
    const value = attributes[name];
    return (hasBeenSet ? "" : "（默认）") +
      (!!value ? "" : "（空值）") +
      `${name} ${value ?? ""}`;
  }).join("\n");
}
