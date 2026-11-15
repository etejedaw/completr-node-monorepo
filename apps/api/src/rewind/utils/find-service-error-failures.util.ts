import { ServiceError } from "../../common/errors/service-error";

export function findServiceErrorFailures(error: unknown): unknown {
	if (!(error instanceof ServiceError)) return undefined;
	const raw = error.serviceError.raw;
	if (typeof raw !== "object" || raw === null || !("failures" in raw))
		return undefined;
	return raw.failures;
}
