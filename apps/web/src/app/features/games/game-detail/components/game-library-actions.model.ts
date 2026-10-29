export interface SecondaryAction {
	id: "queue" | "wishlist" | "shelf" | "lists";
	icon: string;
	activeIcon: string;
	label: string;
	activeLabel: string;
	active: boolean;
	disabled: boolean;
	accentClass: string;
}
