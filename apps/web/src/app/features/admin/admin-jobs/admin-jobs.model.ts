import { type UiBadgeTone } from "../../../shared/ui";

export interface JobAction {
	type: string;
	label: string;
	icon: string;
}

export interface JobStatusStyle {
	icon: string;
	tone: UiBadgeTone;
}
