declare const v1: string;

const arg = v1;

function main(arg: string): string | null {
  const split = arg.split(/(\\\[p\\\])/);

  let q = "";
  for (let i = 0; i < split.length; i += 2) {
    q += split[i];
    if (split[i + 1]) {
      q += randomIntegerBetween(1, 100);
    }
  }

  return "关于「" + q + "」这个问题，{user}得到的答案是：\n#{DRAW-答案之书}";
}

function randomIntegerBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

const result = main(arg);
if (result) {
  Lib.reply(result);
}
