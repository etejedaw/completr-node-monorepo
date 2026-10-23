import { invitationsDomainToHttpMapper } from "../../src/invitations/errors/invitations.domain-to-http.mapper";
import { invitationsErrorDomainNormalizer } from "../../src/invitations/errors/invitations.error-domain.normalizer";
import { invitationsServiceToDomainMapper } from "../../src/invitations/errors/invitations.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "Invitations",
	service: "Invitation Service",
	mapper: invitationsServiceToDomainMapper,
	normalizer: invitationsErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "INVITATION_UNIQUE_CONSTRAINT",
			module: "Invitation Module",
			code: "INVITATION_UNIQUE_CONSTRAINT",
			message: "An invitation for this email is already being created"
		},
		{
			serviceCode: "INVITATION_VALIDATION_ERROR",
			module: "Invitation Module",
			code: "INVITATION_VALIDATION_ERROR",
			message: "Invalid invitation data"
		}
	],
	fallback: {
		module: "Invitation Module",
		code: "INVITATION_INTERNAL_ERROR",
		message: "Unexpected Invitation Service error"
	}
});

describeDomainToHttpMapper({
	name: "Invitations",
	mapper: invitationsDomainToHttpMapper,
	cases: [
		{ code: "INVITATION_NOT_FOUND", status: 404 },
		{ code: "INVITATION_INVALID_TOKEN", status: 404 },
		{ code: "INVITATION_EMAIL_REGISTERED", status: 409 },
		{ code: "INVITATION_UNIQUE_CONSTRAINT", status: 409 },
		{ code: "INVITATION_VALIDATION_ERROR", status: 400 }
	]
});
