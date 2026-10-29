export type RowActionId = "favorite" | "top" | "up" | "down" | "remove";

export interface RowAction {
	id: RowActionId;
	icon: string;
	label: string;
	iconClass: string;
	disabled: boolean;
}
