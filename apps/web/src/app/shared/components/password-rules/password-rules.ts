import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import { PASSWORD_RULES } from "../../../core/utils/password-policy";

@Component({
	selector: "app-password-rules",
	template: `
		<ul
			[id]="listId()"
			aria-label="Password requirements"
			class="list-none m-0 mt-3 p-0 grid gap-1.5 sm:grid-cols-2"
		>
			@for (rule of rules; track rule.id) {
				@let passed = passedRules().has(rule.id);
				<li
					class="flex items-center gap-1.5 text-xs transition-colors"
					[class]="passed ? 'text-success' : 'text-fg-muted'"
				>
					<span aria-hidden="true" class="material-icons text-sm">{{
						passed ? "check_circle" : "radio_button_unchecked"
					}}</span>
					{{ rule.label }}
					<span class="sr-only">{{
						passed ? "(done)" : "(missing)"
					}}</span>
				</li>
			}
		</ul>
	`,
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PasswordRules {
	readonly password = input.required<string>();
	readonly listId = input.required<string>();

	protected readonly rules = PASSWORD_RULES;
	protected readonly passedRules = computed(
		() =>
			new Set(
				PASSWORD_RULES.filter(rule => rule.test(this.password())).map(
					rule => rule.id
				)
			)
	);
}
