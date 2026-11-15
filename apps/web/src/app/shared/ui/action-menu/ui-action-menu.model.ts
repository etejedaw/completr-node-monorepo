import { type Params } from "@angular/router";

export type UiActionMenuVariant = "primary" | "secondary" | "ghost";

export interface UiActionMenuLink {
	routerLink: string | readonly unknown[];
	queryParams?: Params;
	fragment?: string;
}

export interface UiActionMenuItem {
	id: string;
	label: string;
	icon: string;
	iconClass?: string;
	hint?: string;
	premium?: boolean;
	hidePremiumBadge?: boolean;
	locked?: boolean;
	disabled?: boolean;
	busy?: boolean;
	separated?: boolean;
	link?: UiActionMenuLink;
}
