import { type UiBadgeTone } from "../../../shared/ui";

export type JobType =
	| "populate_rawg"
	| "populate_external_data"
	| "calculate_ratings"
	| "calculate_durations";

export interface JobAction {
	type: JobType;
	label: string;
	icon: string;
}

export interface JobStatusStyle {
	icon: string;
	tone: UiBadgeTone;
}
