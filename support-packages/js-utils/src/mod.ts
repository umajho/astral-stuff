/**
 * 返回一个新的数组，这个数组是 `arr` 的各元素之间都插入一个 v`。
 */
export function intersperse<T, U>(arr: T[], v: U): (T | U)[] {
  const result: (T | U)[] = [];
  for (let i = 0; i < arr.length; i++) {
    result.push(arr[i]);
    if (i < arr.length - 1) {
      result.push(v);
    }
  }
  return result;
}

/**
 * 去除 `text` 两侧的空白，但不将换行（“\n”）视作空白。
 */
export function trimSpacesExceptNewLines(text: string): string {
  let i = 0;
  for (; i < text.length; i++) {
    if (/[^ \t]/.test(text[i])) {
      break;
    }
  }
  if (i === text.length) return "";
  let j = text.length - 1;
  for (; j >= 0; j--) {
    if (/[^ \t]/.test(text[j])) {
      break;
    }
  }
  return text.slice(i, j + 1);
}

/**
 * see: https://stackoverflow.com/a/7228322
 */
export function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * see: https://stackoverflow.com/a/12646864
 */
export function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
