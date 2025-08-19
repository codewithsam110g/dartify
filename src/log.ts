import * as fs from 'fs';
import * as path from 'path';

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

interface LogPayload {
  message: string;
  brief?: string;
}

interface LogEntry {
  timestamp: string;
  level: string;
  filename: string;
  message: string;
}

class Logger {
  private static instance: Logger | null = null;
  private filename: string;
  private logFilePath: string;
  private minLevel: LogLevel;

  // ANSI color codes for console output
  private readonly colors = {
    DEBUG: '\x1b[36m',    // Cyan
    INFO: '\x1b[32m',     // Green  
    WARN: '\x1b[33m',     // Yellow
    ERROR: '\x1b[31m',    // Red
    FATAL: '\x1b[35m',    // Magenta
    RESET: '\x1b[0m'      // Reset
  };

  constructor(filename: string, logDirectory: string = './logs', minLevel: LogLevel = LogLevel.INFO) {
    this.filename = filename;
    this.minLevel = minLevel;
    
    // Ensure log directory exists
    if (!fs.existsSync(logDirectory)) {
      fs.mkdirSync(logDirectory, { recursive: true });
    }
    
    // Create log file path (remove .ts extension if present and add .log)
    const baseFilename = path.basename(filename, '.ts');
    this.logFilePath = path.join(logDirectory, `${baseFilename}.log`);
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatFileLogEntry(level: LogLevel, message: string): string {
    const timestamp = this.formatTimestamp();
    const levelName = LogLevel[level];
    
    // No ANSI colors in file output - plain text only
    return `[${timestamp}] [${levelName}] [${this.filename}] ${message}`;
  }

  private formatConsoleLogEntry(level: LogLevel, brief?: string): string {
    const timestamp = this.formatTimestamp();
    const levelName = LogLevel[level];
    const color = this.colors[levelName as keyof typeof this.colors];
    const reset = this.colors.RESET;
    
    if (brief) {
      return `${color}[${timestamp}] [${levelName}] [${this.filename}] ${brief}${reset}`;
    } else {
      return `${color}[${timestamp}] [${levelName}] [${this.filename}]${reset}`;
    }
  }

  private writeToFile(content: string): void {
    try {
      fs.appendFileSync(this.logFilePath, content + '\n', 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private writeToConsole(level: LogLevel, brief?: string): void {
    // Only write to console if brief is provided and not empty
    if (!brief || brief.trim() === '') {
      return;
    }
    
    const consoleMessage = this.formatConsoleLogEntry(level, brief);
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(consoleMessage);
        break;
      case LogLevel.INFO:
        console.info(consoleMessage);
        break;
      case LogLevel.WARN:
        console.warn(consoleMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(consoleMessage);
        break;
    }
  }

  private writeLog(level: LogLevel, payload: LogPayload): void {
    if (!this.shouldLog(level)) return;

    // Always write full message to file
    const fileLogEntry = this.formatFileLogEntry(level, payload.message);
    this.writeToFile(fileLogEntry);

    // Write brief (if provided) or level info to console
    this.writeToConsole(level, payload.brief);
  }

  debug(message: string, brief?: string): void {
    this.writeLog(LogLevel.DEBUG, { message, brief });
  }

  info(message: string, brief?: string): void {
    this.writeLog(LogLevel.INFO, { message, brief });
  }

  warn(message: string, brief?: string): void {
    this.writeLog(LogLevel.WARN, { message, brief });
  }

  error(message: string, brief?: string): void {
    this.writeLog(LogLevel.ERROR, { message, brief });
  }

  fatal(message: string, brief?: string): void {
    this.writeLog(LogLevel.FATAL, { message, brief });
  }

  // Generic log method that takes level as parameter
  log(level: LogLevel, message: string, brief?: string): void {
    this.writeLog(level, { message, brief });
  }

  // Alternative method that takes payload object
  logWithPayload(level: LogLevel, payload: LogPayload): void {
    this.writeLog(level, payload);
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  getLogFilePath(): string {
    return this.logFilePath;
  }

  // Clear the log file
  clearLogFile(): void {
    try {
      fs.writeFileSync(this.logFilePath, '', 'utf8');
    } catch (error) {
      console.error('Failed to clear log file:', error);
    }
  }

  // Singleton instance management
  static initialize(filename: string, logDirectory: string = './logs', minLevel: LogLevel = LogLevel.INFO): Logger {
    // Always create new instance, replacing any existing one
    Logger.instance = new Logger(filename, logDirectory, minLevel);
    return Logger.instance;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      throw new Error('Logger not initialized. Call Logger.initialize() first.');
    }
    return Logger.instance;
  }

  // Static stdout-only methods (no file writing, no filename, just colored timestamp + level + message)
  static stdout = {
    debug: (message: string) => {
      const timestamp = new Date().toISOString();
      const color = '\x1b[36m'; // Cyan
      const reset = '\x1b[0m';
      console.debug(`${color}[${timestamp}] [DEBUG]${reset} ${message}`);
    },
    
    info: (message: string) => {
      const timestamp = new Date().toISOString();
      const color = '\x1b[32m'; // Green
      const reset = '\x1b[0m';
      console.info(`${color}[${timestamp}] [INFO]${reset} ${message}`);
    },
    
    warn: (message: string) => {
      const timestamp = new Date().toISOString();
      const color = '\x1b[33m'; // Yellow
      const reset = '\x1b[0m';
      console.warn(`${color}[${timestamp}] [WARN]${reset} ${message}`);
    },
    
    error: (message: string) => {
      const timestamp = new Date().toISOString();
      const color = '\x1b[31m'; // Red
      const reset = '\x1b[0m';
      console.error(`${color}[${timestamp}] [ERROR]${reset} ${message}`);
    },
    
    fatal: (message: string) => {
      const timestamp = new Date().toISOString();
      const color = '\x1b[35m'; // Magenta
      const reset = '\x1b[0m';
      console.error(`${color}[${timestamp}] [FATAL]${reset} ${message}`);
    }
  };

  // Static convenience methods that use singleton instance
  static debug(message: string, brief?: string): void {
    Logger.getInstance().debug(message, brief);
  }

  static info(message: string, brief?: string): void {
    Logger.getInstance().info(message, brief);
  }

  static warn(message: string, brief?: string): void {
    Logger.getInstance().warn(message, brief);
  }

  static error(message: string, brief?: string): void {
    Logger.getInstance().error(message, brief);
  }

  static fatal(message: string, brief?: string): void {
    Logger.getInstance().fatal(message, brief);
  }

  static log(level: LogLevel, message: string, brief?: string): void {
    Logger.getInstance().log(level, message, brief);
  }
}

export { Logger, LogLevel, LogPayload };