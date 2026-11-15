import { buildHttpErrorMapper } from "../../common/errors/build-http-error-mapper";

export const dataRequestsDomainToHttpMapper = buildHttpErrorMapper({
	DATA_REQUEST_NOT_FOUND: 404,
	DATA_REQUEST_ALREADY_PENDING: 409,
	DATA_REQUEST_NOT_PENDING: 409,
	DATA_REQUEST_NOT_DOWNLOADABLE: 409,
	DATA_REQUEST_EXPIRED: 410,
	DATA_REQUEST_VALIDATION_ERROR: 400
});
