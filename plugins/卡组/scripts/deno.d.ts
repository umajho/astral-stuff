declare module "npm:snabbdom@3.5.1" {
  export * from "snabbdom";
}

declare module "npm:snabbdom-to-html@7.1.0" {
  import x from "snabbdom-to-html";
  export default x;
}

namespace console {
  declare function log(..._: any);
}
