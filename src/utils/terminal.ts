import terminalKit from 'terminal-kit';

import { ConsoleColors } from './colors.js';

const term = terminalKit.terminal;

const writeLine = (color: string, msg: string) => {
  term.colorRgbHex(color)(msg + '\n');
};

const getCurrentTimeTag = (): string => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `[${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}]`;
};

export const terminal = () => {
  const message = (msg: string, color = ConsoleColors.DEFAULT) => {
    writeLine(color, msg);
  };

  const messageWithTag = (
    msg: string,
    tag: string,
    color = ConsoleColors.DEFAULT,
    tagColor = ConsoleColors.TAG_SUCCESS
  ) => {
    const timeTag = getCurrentTimeTag();
    term.colorRgbHex(ConsoleColors.DEFAULT)(timeTag + ' ');
    term.colorRgbHex(tagColor)(`[${tag}] `);
    writeLine(color, msg);
  };

  const infoMessage = (msg: string) => {
    messageWithTag(msg, 'INFO', ConsoleColors.DEFAULT, ConsoleColors.TAG_INFO);
  };

  const warnMessage = (msg: string) => {
    messageWithTag(msg, 'WARN', ConsoleColors.YELLOW, ConsoleColors.TAG_WARN);
  };

  const errorMessage = (msg: string) => {
    messageWithTag(msg, 'ERROR', ConsoleColors.DEFAULT, ConsoleColors.TAG_ERROR);
  };

  const engineMessage = (msg: string) => {
    messageWithTag(msg, 'ENGINE', ConsoleColors.DEFAULT, ConsoleColors.TAG_SUCCESS);
  };

  const mqttMessage = (msg: string) => {
    messageWithTag(msg, 'MQTT', ConsoleColors.DEFAULT, ConsoleColors.TAG_MQTT);
  };

  const clear = () => {
    term.clear();
  };

  return {
    message,
    messageWithTag,
    infoMessage,
    warnMessage,
    errorMessage,
    engineMessage,
    mqttMessage,
    clear,
  };
};
