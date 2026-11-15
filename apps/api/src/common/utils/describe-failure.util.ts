import { ServiceError } from "../errors/service-error";

export function describeFailure(error: unknown) {
	if (error instanceof ServiceError) {
		const { raw } = error.serviceError;
		return typeof raw === "string" ? `${error.code}: ${raw}` : error.code;
	}
	return error instanceof Error ? error.message : String(error);
}
