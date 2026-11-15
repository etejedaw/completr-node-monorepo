export function resolveErrorCode(error: unknown): string {
	if (error instanceof Error && "code" in error)
		return String((error as { code: unknown }).code);
	return error instanceof Error ? error.name : "UNKNOWN";
}
