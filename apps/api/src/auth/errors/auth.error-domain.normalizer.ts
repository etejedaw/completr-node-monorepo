import { buildErrorDomainNormalizer } from "../../common/errors/build-error-domain-normalizer";
import { authServiceToDomainMapper } from "./auth.service-to-domain.mapper";

export const authErrorDomainNormalizer = buildErrorDomainNormalizer(
	authServiceToDomainMapper
);
