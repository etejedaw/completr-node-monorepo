import { type BacklogStatus } from "../../../core/models";
import { type UiBadgeTone } from "../../../shared/ui";

export interface ViewChip {
	label: string;
	icon: string;
	tone: UiBadgeTone;
	status?: BacklogStatus;
	rating?: boolean;
}
