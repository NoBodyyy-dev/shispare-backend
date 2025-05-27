export class Logger {
    private static get timestamp() {
        return new Date().toISOString();
    }

    static info(message: string, meta?: any) {
        console.log(`[${this.timestamp}] INFO: ${message}`, meta);
    }

    static error(message: string, meta?: any) {
        console.error(`[${this.timestamp}] ERROR: ${message}`, meta);
    }

    static warn(message: string, meta?: any) {
        console.warn(`[${this.timestamp}] WARN: ${message}`, meta);
    }
}