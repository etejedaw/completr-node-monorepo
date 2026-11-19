import { type UiPickerTriggerSize } from "./ui-option-picker.model";

export function compactPickerTriggerClass(
	size: UiPickerTriggerSize,
	active: boolean
): string {
	return (
		(size === "md" ? "h-10 " : "h-9 ") +
		"max-sm:min-h-[44px] tap:min-h-[44px] px-3 inline-flex items-center gap-1.5 rounded-card border bg-transparent text-sm font-medium whitespace-nowrap cursor-pointer transition hover:border-brand hover:text-brand " +
		(active ? "border-brand text-brand" : "border-line text-fg-secondary")
	);
}
