import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
	signal
} from "@angular/core";
import { form, FormField } from "@angular/forms/signals";

import {
	UiAlert,
	UiButton,
	UiDialog,
	UiFieldLabel,
	UiFormField,
	UiInput,
	UiLabel
} from "../../../shared/ui";

@Component({
	selector: "app-admin-account-deletion-dialog",
	imports: [
		FormField,
		UiAlert,
		UiButton,
		UiDialog,
		UiFieldLabel,
		UiFormField,
		UiInput,
		UiLabel
	],
	template: `
		<ui-dialog
			eyebrow="Users"
			icon="delete_forever"
			tone="danger"
			size="sm"
			[heading]="heading()"
			[subheading]="description()"
			[dismissible]="!busy()"
			(closed)="cancelled.emit()"
		>
			<ui-alert tone="danger" icon="warning" class="mb-4">
				This can't be undone. The account, its library, lists, reviews
				and activity are deleted for good.
			</ui-alert>
			<form
				id="account-deletion-form"
				novalidate
				(submit)="submit($event)"
			>
				<div uiFormField>
					<label uiLabel uiFieldLabel for="account-deletion-username"
						>Type <strong class="text-fg">{{ username() }}</strong> to
						confirm</label
					>
					<input
						id="account-deletion-username"
						uiInput
						type="text"
						autocomplete="off"
						autocapitalize="off"
						spellcheck="false"
						[formField]="confirmationForm.typedUsername"
					/>
				</div>
			</form>
			<ng-container dialogFooter>
				<button
					uiButton
					type="button"
					variant="ghost"
					[disabled]="busy()"
					(click)="cancelled.emit()"
				>
					Cancel
				</button>
				<button
					uiButton
					type="submit"
					variant="danger"
					form="account-deletion-form"
					[disabled]="busy() || !matchesUsername()"
				>
					{{ busy() ? "Deleting…" : confirmLabel() }}
				</button>
			</ng-container>
		</ui-dialog>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminAccountDeletionDialog {
	readonly username = input.required<string>();
	readonly heading = input("Delete account?");
	readonly description = input<string | null>(null);
	readonly confirmLabel = input("Delete account");
	readonly busy = input(false);
	readonly confirmed = output<void>();
	readonly cancelled = output<void>();

	private readonly confirmation = signal({ typedUsername: "" });
	protected readonly confirmationForm = form(this.confirmation);
	protected readonly matchesUsername = computed(
		() => this.confirmation().typedUsername.trim() === this.username()
	);

	protected submit(event: Event) {
		event.preventDefault();
		if (this.busy() || !this.matchesUsername()) return;
		this.confirmed.emit();
	}
}
