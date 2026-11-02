export interface PickerOption {
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

export interface PickerAction {
	id: string;
	label: string;
	icon: string;
}
