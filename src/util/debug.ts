class Debug {
  private enabled: boolean;

  constructor() {
    this.enabled = process.env['NODE_ENV'] !== 'production';
  }

  log(...args: any[]) {
    if (this.enabled) {
      console.log('[DEBUG]', ...args);
    }
  }

  warn(...args: any[]) {
    if (this.enabled) {
      console.warn('[WARN]', ...args);
    }
  }

  error(...args: any[]) {
    if (this.enabled) {
      console.error('[ERROR]', ...args);
    }
  }

  group(label: string) {
    if (this.enabled) {
      console.group(label);
    }
  }

  groupEnd() {
    if (this.enabled) {
      console.groupEnd();
    }
  }

  table(data: any) {
    if (this.enabled) {
      console.table(data);
    }
  }
}

export const debug = new Debug(); 