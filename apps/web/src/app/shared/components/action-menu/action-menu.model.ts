import { type Params } from "@angular/router";

export type ActionMenuVariant = "primary" | "secondary" | "ghost";

export interface ActionMenuLink {
	routerLink: string | readonly unknown[];
	queryParams?: Params;
	fragment?: string;
}

export interface ActionMenuItem {
	id: string;
	label: string;
	icon: string;
	iconClass?: string;
	hint?: string;
	premium?: boolean;
	locked?: boolean;
	disabled?: boolean;
	busy?: boolean;
	separated?: boolean;
	link?: ActionMenuLink;
}
