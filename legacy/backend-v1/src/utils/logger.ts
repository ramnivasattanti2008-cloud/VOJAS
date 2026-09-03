type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

class Logger {
  private format(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  info(message: string, meta?: any) {
    console.log(this.format("INFO", message, meta));
  }

  warn(message: string, meta?: any) {
    console.warn(this.format("WARN", message, meta));
  }

  error(message: string, meta?: any) {
    console.error(this.format("ERROR", message, meta));
  }

  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV === "development") {
      console.debug(this.format("DEBUG", message, meta));
    }
  }
}

export const logger = new Logger();
