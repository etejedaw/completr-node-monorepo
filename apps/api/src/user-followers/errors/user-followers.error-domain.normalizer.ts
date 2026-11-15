import { buildErrorDomainNormalizer } from "../../common/errors/build-error-domain-normalizer";
import { userFollowersServiceToDomainMapper } from "./user-followers.service-to-domain.mapper";

export const userFollowersErrorDomainNormalizer = buildErrorDomainNormalizer(
	userFollowersServiceToDomainMapper
);
