import {
	booleanAttribute,
	ChangeDetectionStrategy,
	Component,
	input
} from "@angular/core";

@Component({
	selector: "ui-field-error",
	template: `
		<span
			aria-hidden="true"
			class="material-icons shrink-0 text-sm leading-4"
			>error_outline</span
		>
		<span class="min-w-0 break-words"><ng-content /></span>
	`,
	host: {
		class: "mt-1.5 flex items-start gap-1 text-xs leading-4 text-danger",
		"[attr.role]": "announce() ? 'alert' : null"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiFieldError {
	readonly announce = input(false, { transform: booleanAttribute });
}
