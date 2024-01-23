import TOML from "@iarna/toml";

/**
 * @returns {import("rollup").InputPluginOption}
 */
function rollupPluginAstralDice(auto) {
  return {
    name: "rollup-plugin-astral-dice",
    // see: https://stackoverflow.com/a/64110604
    generateBundle(_opts, bundle) {
      const entry = Object.values(bundle).find((chunk) => chunk.isEntry);
      this.emitFile({
        type: "asset",
        fileName: `${entry.name}.toml`,
        source: TOML.stringify({
          auto: [{ ...auto, js: makeSafeJs(entry.code) }],
        }),
      });
    },
  };
}

/**
 * 星骰的 TOML 解码器与这边用的 TOML 编码器相性不好，如果把 js 代码直接在这边编
 * 码成 TOML 字符串，那边会遇到奇奇怪怪的问题。所以出此下策，将 js 代码编码为
 * URI 组件。由于双引号、反斜杠都会被编码，直接把编码后的文本嵌套进双引号里很安
 * 全。
 *
 * base64 也许也是种选择，但星骰的 js 环境甚至不支持 `atob`…
 *
 * @param {string} input
 * @returns {string}
 */
function makeSafeJs(input) {
  const inputEncoded = encodeURIComponent(input);
  return `eval(decodeURIComponent("${inputEncoded}"));void 0`;
}

export default rollupPluginAstralDice;
