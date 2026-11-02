export type CoverActionId = "favorite" | "wishlist" | "backlog";

export interface CoverAction {
	id: CoverActionId;
	label: string;
	icon: string;
	active: boolean;
	pressed: boolean | null;
	alwaysVisible: boolean;
	overlayActiveClass: string;
	barActiveClass: string;
}

export interface GameCoverCardGame {
	code: string;
	title: string;
	coverUrl?: string;
	backgroundUrl?: string;
}
