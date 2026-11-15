import { buildHttpErrorMapper } from "../../common/errors/build-http-error-mapper";

export const activityDomainToHttpMapper = buildHttpErrorMapper({
	ACTIVITY_FEED_FILTER_PREMIUM: 402,
	ACTIVITY_NOT_FOUND: 404
});
