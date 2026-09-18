import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Activity Module";

export function feedFilterPremiumRequired(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"ACTIVITY_FEED_FILTER_PREMIUM",
		"Filtering the feed by category or type is a premium feature.",
		context
	);
}
