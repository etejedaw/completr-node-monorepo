import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "Rewind Editions Service" };

export function editionNotFoundError() {
	return new ServiceError("REWIND_EDITION_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function editionExistsError(raw?: unknown) {
	return new ServiceError("REWIND_EDITION_EXISTS", { ...BASE_OPTIONS, raw });
}

export function editionOverlapError() {
	return new ServiceError("REWIND_EDITION_OVERLAP", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function editionFrozenError() {
	return new ServiceError("REWIND_EDITION_FROZEN", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function editionInvalidError(raw?: unknown) {
	return new ServiceError("REWIND_EDITION_INVALID", { ...BASE_OPTIONS, raw });
}
