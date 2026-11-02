export interface SegmentedOption<T extends string = string> {
	value: T;
	label: string;
	count?: number;
	icon?: string;
	hint?: string;
}
