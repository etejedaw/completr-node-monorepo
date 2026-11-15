import { buildErrorDomainNormalizer } from "../../common/errors/build-error-domain-normalizer";
import { dataRequestsServiceToDomainMapper } from "./data-requests.service-to-domain.mapper";

export const dataRequestsErrorDomainNormalizer = buildErrorDomainNormalizer(
	dataRequestsServiceToDomainMapper
);
