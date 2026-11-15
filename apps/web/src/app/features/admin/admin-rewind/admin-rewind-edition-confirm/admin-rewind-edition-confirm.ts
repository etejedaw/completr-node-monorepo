import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	model,
	output
} from "@angular/core";

import { UiAlert, UiButton, UiCheckbox, UiDialog } from "../../../../shared/ui";

@Component({
	selector: "app-admin-rewind-edition-confirm",
	imports: [UiAlert, UiButton, UiCheckbox, UiDialog],
	templateUrl: "./admin-rewind-edition-confirm.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminRewindEditionConfirm {
	readonly year = input.required<number>();
	readonly generatedCount = input.required<number>();
	readonly saving = input(false);
	readonly error = input("");
	readonly applyToGenerated = model(false);
	readonly confirmed = output<void>();
	readonly back = output<void>();

	protected readonly confirmMessage = computed(() => {
		const count = this.generatedCount();
		const generated =
			count === 1
				? "1 Rewind is already generated"
				: `${count} Rewinds are already generated`;
		return `Rewind ${this.year()} is in progress and ${generated}. Changing the AI generation quotas can change how many AI generations users with a Rewind in progress have left.`;
	});

	protected confirm() {
		if (!this.saving()) this.confirmed.emit();
	}

	protected goBack() {
		if (!this.saving()) this.back.emit();
	}
}
