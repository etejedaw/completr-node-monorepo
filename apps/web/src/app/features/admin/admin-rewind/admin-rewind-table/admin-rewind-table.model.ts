import { type UiBadgeTone } from "../../../../shared/ui";

export interface AccessKindBadge {
	label: string;
	tone: UiBadgeTone;
	icon: string;
}

export interface RegenerationsDraft {
	id: string;
	value: string;
	touched: boolean;
	serverError: string | null;
}
