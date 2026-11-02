import { type FeedActivity } from "./feed.model";

export interface ActivityDayGroup {
	key: string;
	label: string;
	activities: FeedActivity[];
}
