export type BulkActionTone = "default" | "danger";

export interface BulkAction {
	id: string;
	label: string;
	icon: string;
	eligibleCount: number;
	tone: BulkActionTone;
	overflow?: boolean;
}

export interface BulkItemNoun {
	one: string;
	other: string;
}
