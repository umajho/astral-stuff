import { defaultTexts, Texts } from "russian-roulette-core";

const TEXTS: Texts = (() => {
  try {
    return JSON.parse("" + Lib.getConfig("texts"));
  } catch {
    return defaultTexts;
  }
})();

export default TEXTS;
