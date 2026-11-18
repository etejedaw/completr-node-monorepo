export interface UiPickerOption {
	value: string;
	label: string;
	shortLabel?: string;
	icon?: string;
	iconClass?: string;
	iconColor?: string | null;
	count?: number | null;
	hint?: string;
	locked?: boolean;
	link?: string;
	fragment?: string;
}

export interface UiPickerAction {
	id: string;
	label: string;
	icon: string;
}

export type UiPickerTriggerSize = "sm" | "md";

export type UiMultiPickerVariant = "field" | "compact";
