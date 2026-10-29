export type InfoPageId = "help" | "whats-new" | "about" | "privacy";

export interface InfoPageLink {
	id: InfoPageId;
	route: string;
	icon: string;
	label: string;
	hint: string;
}
