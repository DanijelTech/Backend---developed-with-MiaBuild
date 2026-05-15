/**
 * Logger - Structured logging module
 * Provides JSON-structured logging with multiple log levels
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LoggerConfig {
  service?: string;
  level?: LogLevel;
  pretty?: boolean;
  timestamp?: boolean;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service?: string;
  context?: Record<string, unknown>;
  error?: Error;
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  fatal(message: string, context?: Record<string, unknown>): void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4
};

const config: LoggerConfig = {
  service: 'app',
  level: 'info',
  pretty: false,
  timestamp: true
};

function formatLogEntry(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: config.service,
    ...(context && { context })
  };

  if (config.pretty) {
    return JSON.stringify(entry, null, 2);
  }
  return JSON.stringify(entry);
}

function shouldLog(level: LogLevel): boolean {
  const configLevel = config.level || 'info';
  return LOG_LEVELS[level] >= LOG_LEVELS[configLevel];
}

/**
 * Create a new Logger instance
 */
export function createLogger(userConfig?: LoggerConfig): Logger {
  if (userConfig) {
    Object.assign(config, userConfig);
  }

  return {
    debug(message: string, context?: Record<string, unknown>): void {
      if (shouldLog('debug')) {
        console.debug(formatLogEntry('debug', message, context));
      }
    },

    info(message: string, context?: Record<string, unknown>): void {
      if (shouldLog('info')) {
        console.log(formatLogEntry('info', message, context));
      }
    },

    warn(message: string, context?: Record<string, unknown>): void {
      if (shouldLog('warn')) {
        console.warn(formatLogEntry('warn', message, context));
      }
    },

    error(message: string, context?: Record<string, unknown>): void {
      if (shouldLog('error')) {
        console.error(formatLogEntry('error', message, context));
      }
    },

    fatal(message: string, context?: Record<string, unknown>): void {
      console.error(formatLogEntry('fatal', message, context));
    }
  };
}

let _loggerInstance: Logger | null = null;

/**
 * Get the singleton Logger instance
 */
export function getLogger(): Logger {
  if (!_loggerInstance) {
    _loggerInstance = createLogger();
  }
  return _loggerInstance;
}

export default { createLogger, getLogger };