export interface Logger {
	debug(operation: string, result: string, extra?: unknown): void;
	info(operation: string, result: string, extra?: unknown): void;
	warn(operation: string, result: string, extra?: unknown): void;
	error(operation: string, result: string, extra?: unknown): void;
}
