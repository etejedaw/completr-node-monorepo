export type FavoriteReorderAction = "earlier" | "first" | "later";

export interface ReorderButton {
	id: FavoriteReorderAction;
	icon: string;
	label: string;
	disabled: boolean;
}
