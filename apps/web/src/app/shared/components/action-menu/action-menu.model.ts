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
}
