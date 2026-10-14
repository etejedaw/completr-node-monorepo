import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

export type UiAlertTone = "danger" | "warning" | "info" | "success";

const TONE_CLASSES: Record<UiAlertTone, string> = {
	danger: "bg-danger/10 border-danger/25 text-danger",
	warning: "bg-warning/10 border-warning/25 text-warning",
	info: "bg-info/10 border-info/25 text-info",
	success: "bg-success/10 border-success/25 text-success"
};

const TONE_ICONS: Record<UiAlertTone, string> = {
	danger: "error_outline",
	warning: "warning_amber",
	info: "info",
	success: "check_circle"
};

@Component({
	selector: "ui-alert",
	template: `
		<span
			aria-hidden="true"
			class="material-icons shrink-0 text-[1.125rem] leading-5"
			>{{ resolvedIcon() }}</span
		>
		<div class="min-w-0 flex-1 leading-5"><ng-content /></div>
	`,
	host: {
		class: "flex items-start gap-2 rounded-card border px-3 py-2 text-[0.8125rem]",
		"[class]": "toneClass()",
		"[attr.role]": "role()"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiAlert {
	readonly tone = input<UiAlertTone>("danger");
	readonly icon = input<string>("");

	protected readonly resolvedIcon = computed(
		() => this.icon() || TONE_ICONS[this.tone()]
	);
	protected readonly toneClass = computed(() => TONE_CLASSES[this.tone()]);
	protected readonly role = computed(() =>
		this.tone() === "danger" || this.tone() === "warning"
			? "alert"
			: "status"
	);
}
