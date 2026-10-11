import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "ScoreSource Service" };

export function uniqueConstraintError(rawError: unknown) {
	return new ServiceError("SCORE_SOURCE_UNIQUE_CONSTRAINT", {
		...BASE_OPTIONS,
		raw: rawError
	});
}
