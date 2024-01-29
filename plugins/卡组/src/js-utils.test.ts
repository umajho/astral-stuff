import { describe, expect, it } from "vitest";

import { intersperse, trimSpacesExceptNewLines } from "./js-utils";

describe("intersperse", () => {
  const table: [[any[], any], any][] = [
    [[[], "!!"], []],
    [[["foo"], "!!"], ["foo"]],
    [[["foo", "bar", "baz"], "!!"], ["foo", "!!", "bar", "!!", "baz"]],
    [[["foo", "bar", "baz"], 0], ["foo", 0, "bar", 0, "baz"]],
  ];

  for (const [i, [[inputArr, inputV], expected]] of table.entries()) {
    it(`case ${i + 1}: ${JSON.stringify(inputArr)}, ${JSON.stringify(inputV)}`, () => {
      expect(intersperse(inputArr, inputV)).toEqual(expected);
    });
  }
});

describe("trimSpacesExceptNewLines", () => {
  const table: [string, string][] = [
    ["foo", "foo"],
    ["  foo\t ", "foo"],
    ["\t  \nfoo \n", "\nfoo \n"],
  ];

  for (const [i, [input, expected]] of table.entries()) {
    it(`case ${i + 1}: ${input}`, () => {
      expect(trimSpacesExceptNewLines(input)).toBe(expected);
    });
  }
});
