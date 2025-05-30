import terminalKit from 'terminal-kit';

import { ConsoleColors } from './colors.js';

const term = terminalKit.terminal;

const writeLine = (color: string, msg: string) => {
  term.colorRgbHex(color)(msg + '\n');
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
    term.colorRgbHex(tagColor, `[${tag}] `);
    writeLine(color, msg);
  };

  const info = (msg: string) => {
    messageWithTag(msg, 'INFO', ConsoleColors.DEFAULT, ConsoleColors.TAG_INFO);
  };

  const warn = (msg: string) => {
    messageWithTag(msg, 'WARN', ConsoleColors.YELLOW, ConsoleColors.TAG_WARN);
  };

  const error = (msg: string) => {
    messageWithTag(msg, 'ERROR', ConsoleColors.TAG_ERROR, ConsoleColors.TAG_ERROR);
  };

  const engine = (msg: string) => {
    messageWithTag(msg, 'ENGINE', ConsoleColors.DEFAULT, ConsoleColors.TAG_SUCCESS);
  };

  const mqtt = (msg: string) => {
    messageWithTag(msg, 'MQTT', ConsoleColors.DEFAULT, ConsoleColors.TAG_MQTT);
  };

  const clear = () => {
    term.clear();
  };

  return { message, messageWithTag, info, warn, error, engine, mqtt, clear };
};
