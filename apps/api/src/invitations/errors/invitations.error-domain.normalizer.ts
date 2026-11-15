import { buildErrorDomainNormalizer } from "../../common/errors/build-error-domain-normalizer";
import { invitationsServiceToDomainMapper } from "./invitations.service-to-domain.mapper";

export const invitationsErrorDomainNormalizer = buildErrorDomainNormalizer(
	invitationsServiceToDomainMapper
);
