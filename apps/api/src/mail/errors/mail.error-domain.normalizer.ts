import { buildErrorDomainNormalizer } from "../../common/errors/build-error-domain-normalizer";
import { mailServiceToDomainMapper } from "./mail.service-to-domain.mapper";

export const mailErrorDomainNormalizer = buildErrorDomainNormalizer(
	mailServiceToDomainMapper
);
