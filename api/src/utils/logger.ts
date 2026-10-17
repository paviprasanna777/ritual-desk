type LogLevel = 'info' | 'warn' | 'error';

function write(level: LogLevel, message: string, detail?: unknown): void {
  const prefix = `${new Date().toISOString()} [${level.toUpperCase()}]`;
  const output = level === 'error'
    ? console.error
    : level === 'warn'
      ? console.warn
      : console.info;

  if (detail === undefined) {
    output(`${prefix} ${message}`);
    return;
  }

  output(`${prefix} ${message}`, detail);
}

export const logger = {
  info: (message: string, detail?: unknown): void => write('info', message, detail),
  warn: (message: string, detail?: unknown): void => write('warn', message, detail),
  error: (message: string, detail?: unknown): void => write('error', message, detail),
};
