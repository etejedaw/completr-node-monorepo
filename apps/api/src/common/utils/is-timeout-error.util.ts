const TIMEOUT_ERROR_NAME = "TimeoutError";

export function isTimeoutError(error: unknown): boolean {
	return error instanceof Error && error.name === TIMEOUT_ERROR_NAME;
}
