import { type List } from "../../../core/models";
import { type UiChipOption } from "../../../shared/ui";

export interface ListModalData {
	list: List | null;
}

export interface SourceOption {
	value: string;
	label: string;
}

export type SourceField = "scoreSource" | "durationSource";

export interface SourceGroup {
	field: SourceField;
	label: string;
	options: readonly UiChipOption[];
	selected: readonly string[];
}

export type ListModalResult =
	| { status: "created"; list: List }
	| { status: "saved" }
	| { status: "deleted" };
