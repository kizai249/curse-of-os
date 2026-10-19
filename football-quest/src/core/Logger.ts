/** Structured logging. Every entry carries a scope so logs can be filtered per module. */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  readonly level: LogLevel;
  readonly scope: string;
  readonly message: string;
  readonly data?: unknown;
  readonly time: number;
}

export type LogSink = (entry: LogEntry) => void;

export interface Logger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
  child(scope: string): Logger;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export const consoleSink: LogSink = (entry) => {
  const line = `[${entry.scope}] ${entry.message}`;
  const args = entry.data === undefined ? [line] : [line, entry.data];
  switch (entry.level) {
    case 'debug': console.debug(...args); break;
    case 'info': console.info(...args); break;
    case 'warn': console.warn(...args); break;
    case 'error': console.error(...args); break;
  }
};

export function createLogger(scope: string, sink: LogSink = consoleSink, minLevel: LogLevel = 'info'): Logger {
  const log = (level: LogLevel, message: string, data?: unknown): void => {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;
    sink({ level, scope, message, data, time: Date.now() });
  };
  return {
    debug: (m, d) => log('debug', m, d),
    info: (m, d) => log('info', m, d),
    warn: (m, d) => log('warn', m, d),
    error: (m, d) => log('error', m, d),
    child: (child) => createLogger(`${scope}.${child}`, sink, minLevel),
  };
}

/** Collects entries in memory; used by tests to assert on logged errors. */
export function createMemorySink(): { sink: LogSink; entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  return { sink: (e) => entries.push(e), entries };
}
