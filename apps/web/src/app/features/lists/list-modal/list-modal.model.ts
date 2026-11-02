import { type List } from "../../../core/models";
import { type ChipOption } from "../../../shared/components/chip-group/chip-group.model";

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
	options: readonly ChipOption[];
	selected: readonly string[];
}

export type ListModalResult =
	| { status: "created"; list: List }
	| { status: "saved" }
	| { status: "deleted" };
