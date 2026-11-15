import { buildHttpErrorMapper } from "../../common/errors/build-http-error-mapper";

export const mailDomainToHttpMapper = buildHttpErrorMapper({
	MAIL_DISABLED: 503,
	MAIL_SEND_ERROR: 502
});
