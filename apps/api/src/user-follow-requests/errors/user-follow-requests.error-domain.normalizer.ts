import { buildErrorDomainNormalizer } from "../../common/errors/build-error-domain-normalizer";
import { userFollowRequestsServiceToDomainMapper } from "./user-follow-requests.service-to-domain.mapper";

export const userFollowRequestsErrorDomainNormalizer =
	buildErrorDomainNormalizer(userFollowRequestsServiceToDomainMapper);
