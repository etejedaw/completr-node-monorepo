import { buildHttpErrorMapper } from "../../common/errors/build-http-error-mapper";

export const invitationsDomainToHttpMapper = buildHttpErrorMapper({
	INVITATION_NOT_FOUND: 404,
	INVITATION_INVALID_TOKEN: 404,
	INVITATION_EMAIL_REGISTERED: 409,
	INVITATION_UNIQUE_CONSTRAINT: 409,
	INVITATION_VALIDATION_ERROR: 400
});
