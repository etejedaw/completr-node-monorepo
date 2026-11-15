import { buildErrorDomainNormalizer } from "../../common/errors/build-error-domain-normalizer";
import { usersServiceToDomainMapper } from "./users.service-to-domain.mapper";

export const usersErrorDomainNormalizer = buildErrorDomainNormalizer(
	usersServiceToDomainMapper
);
