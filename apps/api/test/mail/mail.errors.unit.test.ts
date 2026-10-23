import { mailDomainToHttpMapper } from "../../src/mail/errors/mail.domain-to-http.mapper";
import { mailErrorDomainNormalizer } from "../../src/mail/errors/mail.error-domain.normalizer";
import { mailServiceToDomainMapper } from "../../src/mail/errors/mail.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "Mail",
	service: "Mail Provider",
	mapper: mailServiceToDomainMapper,
	normalizer: mailErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "MAIL_DISABLED",
			module: "Mail Provider",
			code: "MAIL_DISABLED",
			message: "Email delivery is disabled"
		},
		{
			serviceCode: "MAIL_SEND_ERROR",
			module: "Mail Provider",
			code: "MAIL_SEND_ERROR",
			message: "Email could not be sent"
		}
	],
	fallback: {
		module: "Mail Provider",
		code: "MAIL_INTERNAL_ERROR",
		message: "Unexpected Mail Provider error"
	}
});

describeDomainToHttpMapper({
	name: "Mail",
	mapper: mailDomainToHttpMapper,
	cases: [
		{ code: "MAIL_DISABLED", status: 503 },
		{ code: "MAIL_SEND_ERROR", status: 502 }
	]
});
