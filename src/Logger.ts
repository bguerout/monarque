export interface Logger {
  debug(message: string, ...meta: any[]): void;
  info(message: string, ...meta: any[]): void;
  warn(message: string, ...meta: any[]): void;
  error(message: unknown, ...meta: any[]): void;
}

export class ConsoleLogger implements Logger {
  debug(message: string): void {
    console.debug(message);
  }
  info(message: string): void {
    console.info(message);
  }
  warn(message: string): void {
    console.warn(message);
  }
  error(message: unknown, ...meta: any[]): void {
    console.error(message, ...meta);
  }
}
