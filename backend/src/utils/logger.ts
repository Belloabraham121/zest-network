/**
 * Simple logger utility for the application
 */
export interface LogLevel {
  DEBUG: 0;
  INFO: 1;
  WARN: 2;
  ERROR: 3;
}

export const LOG_LEVELS: LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

class Logger {
  private currentLevel: number = LOG_LEVELS.INFO;
  private prefix: string = "[LiFi]";

  constructor(prefix?: string) {
    if (prefix) {
      this.prefix = prefix;
    }

    // Set log level from environment
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLevel && envLevel in LOG_LEVELS) {
      this.currentLevel = LOG_LEVELS[envLevel as keyof LogLevel];
    }
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${this.prefix} [${level}] ${message}${metaStr}`;
  }

  private shouldLog(level: number): boolean {
    return level >= this.currentLevel;
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      console.debug(this.formatMessage("DEBUG", message, meta));
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      console.info(this.formatMessage("INFO", message, meta));
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      console.warn(this.formatMessage("WARN", message, meta));
    }
  }

  error(message: string, meta?: any): void {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      console.error(this.formatMessage("ERROR", message, meta));
    }
  }

  setLevel(level: keyof LogLevel): void {
    this.currentLevel = LOG_LEVELS[level];
  }

  getLevel(): number {
    return this.currentLevel;
  }
}

// Export singleton instance
export const logger = new Logger();
export default logger;

// Export class for custom instances
export { Logger };
