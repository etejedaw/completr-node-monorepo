export interface UiSegmentedOption<T extends string = string> {
	value: T;
	label: string;
	count?: number;
	icon?: string;
	hint?: string;
}

export type UiSegmentedControlSemantics = "radio" | "toggle";
