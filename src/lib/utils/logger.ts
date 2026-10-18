const isDev = process.env.NODE_ENV !== 'production';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const shouldEmitLevel = (level: LogLevel): boolean => {
  if (level === 'error') {
    return true;
  }

  return isDev;
};

const emit = (level: LogLevel, event: string, context?: unknown, ...args: unknown[]) => {
  if (!shouldEmitLevel(level)) {
    return;
  }

  const payload =
    context &&
    typeof context === 'object' &&
    Object.keys(context as Record<string, unknown>).length > 0
      ? context
      : context;
  const prefix = `[${level.toUpperCase()}] ${event}`;

  switch (level) {
    case 'debug':
      if (payload) {
        console.debug(prefix, payload, ...args);
      } else {
        console.debug(prefix, ...args);
      }
      return;
    case 'info':
      if (payload) {
        console.info(prefix, payload, ...args);
      } else {
        console.info(prefix, ...args);
      }
      return;
    case 'warn':
      if (payload) {
        console.warn(prefix, payload, ...args);
      } else {
        console.warn(prefix, ...args);
      }
      return;
    default:
      if (payload) {
        console.error(prefix, payload, ...args);
      } else {
        console.error(prefix, ...args);
      }
  }
};

export const logger = {
  log: (event: string, ...args: unknown[]) => {
    emit('debug', event, undefined, ...args);
  },
  debug: (event: string, context?: unknown, ...args: unknown[]) => {
    emit('debug', event, context, ...args);
  },
  info: (event: string, context?: unknown, ...args: unknown[]) => {
    emit('info', event, context, ...args);
  },
  warn: (event: string, context?: unknown, ...args: unknown[]) => {
    emit('warn', event, context, ...args);
  },
  error: (event: string, context?: unknown, ...args: unknown[]) => {
    emit('error', event, context, ...args);
  },
};