export type NavAccess = "everyone" | "moderator" | "admin";

export interface NavItem {
	route: string;
	icon: string;
	label: string;
	iconColorClass: string;
	tooltip?: string;
	access?: NavAccess;
}

export interface NavSection {
	id: string;
	heading: string | null;
	moderatorHeading?: string;
	access?: NavAccess;
	pinnedToBottom?: boolean;
	items: NavItem[];
}
