import { CommandType, localizeCommandType } from "deck-core";

export function errorUnknownCommand<T extends CommandType, U extends string>(
  commandType: T,
  commandName: U,
): ["error", string, { commandType: T; commandName: U }] {
  const cmdTypL10n = localizeCommandType(commandType);
  return [
    "error",
    `「${cmdTypL10n}」未知命令「${commandName}」`,
    { commandType, commandName },
  ];
}

export function errorShouldNotHaveArguments<
  T extends CommandType,
  U extends string,
>(
  commandType: T,
  commandName: U,
): ["error", string, { commandType: T; commandName: U }] {
  return errorBadArguments(commandType, commandName, "不应存在参数");
}

export function errorShouldHaveArguments<
  T extends CommandType,
  U extends string,
>(
  commandType: T,
  commandName: U,
): ["error", string, { commandType: T; commandName: U }] {
  return errorBadArguments(commandType, commandName, "参数不应为空");
}

export function errorBadArguments<
  T extends CommandType,
  U extends string,
>(
  commandType: T,
  commandName: U,
  detail: string,
): ["error", string, { commandType: T; commandName: U }] {
  const cmdTypL10n = localizeCommandType(commandType);
  return [
    "error",
    `「${cmdTypL10n}」命令「${commandName}」参数有误：${detail}`,
    { commandType, commandName },
  ];
}
