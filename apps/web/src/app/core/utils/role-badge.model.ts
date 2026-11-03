import { type UiBadgeTone } from "../../shared/ui/badge/ui-badge";

export interface RoleBadge {
	label: string;
	className: string;
	tone: UiBadgeTone;
	icon: string | null;
}
