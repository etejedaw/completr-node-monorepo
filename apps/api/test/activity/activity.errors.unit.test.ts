import { activityDomainToHttpMapper } from "../../src/activity/errors/activity.domain-to-http.mapper";
import { describeDomainToHttpMapper } from "../unit-helpers/error-layers";

describeDomainToHttpMapper({
	name: "Activity",
	mapper: activityDomainToHttpMapper,
	cases: [{ code: "ACTIVITY_FEED_FILTER_PREMIUM", status: 402 }]
});
