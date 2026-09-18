import { type Logger } from "./logger.interface";
import { pinoConfig as baseLogger } from "./pino.config";

export class PinoLogger implements Logger {
	constructor(private readonly moduleName: string) {}

	#format(operation: string, result: string, extra?: unknown) {
		const base = `${this.moduleName.toUpperCase()}[${operation}: ${result}]`;
		return extra ? `${base} ${JSON.stringify(extra)}` : base;
	}

	debug(operation: string, result: string, extra?: unknown) {
		baseLogger.debug(this.#format(operation, result, extra));
	}

	info(operation: string, result: string, extra?: unknown) {
		baseLogger.info(this.#format(operation, result, extra));
	}

	warn(operation: string, result: string, extra?: unknown) {
		baseLogger.warn(this.#format(operation, result, extra));
	}

	error(operation: string, result: string, extra?: unknown) {
		baseLogger.error(this.#format(operation, result, extra));
	}
}
