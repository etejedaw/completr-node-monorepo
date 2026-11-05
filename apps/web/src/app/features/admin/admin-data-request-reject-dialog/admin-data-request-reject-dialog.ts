import {
	ChangeDetectionStrategy,
	Component,
	input,
	output,
	signal
} from "@angular/core";
import {
	form,
	FormField,
	maxLength,
	required,
	validate
} from "@angular/forms/signals";

import {
	UiButton,
	UiDialog,
	UiFieldError,
	UiFieldLabel,
	UiFormField,
	UiLabel,
	UiTextarea
} from "../../../shared/ui";

const REJECTION_REASON_MAX_LENGTH = 500;
const REASON_REQUIRED_MESSAGE = "Explain why the request is rejected.";

@Component({
	selector: "app-admin-data-request-reject-dialog",
	imports: [
		FormField,
		UiButton,
		UiDialog,
		UiFieldError,
		UiFieldLabel,
		UiFormField,
		UiLabel,
		UiTextarea
	],
	template: `
		<ui-dialog
			eyebrow="Data requests"
			icon="block"
			tone="warning"
			size="sm"
			heading="Reject request?"
			[subheading]="subheading()"
			[dismissible]="!busy()"
			(closed)="cancelled.emit()"
		>
			<form id="reject-request-form" novalidate (submit)="submit($event)">
				<div uiFormField>
					<label uiLabel uiFieldLabel for="reject-request-reason"
						>Reason</label
					>
					<textarea
						id="reject-request-reason"
						uiTextarea
						rows="4"
						placeholder="We couldn't verify that this request comes from the account owner."
						aria-describedby="reject-request-reason-hint reject-request-reason-error"
						[formField]="rejectionForm.reason"
					></textarea>
					<p
						id="reject-request-reason-hint"
						class="m-0 mt-1 text-xs text-fg-muted tabular-nums"
					>
						The user sees this reason. {{ rejection().reason.length }}
						/ {{ maxLength }}
					</p>
					@if (
						rejectionForm.reason().touched() &&
						rejectionForm.reason().invalid()
					) {
						<ui-field-error id="reject-request-reason-error">{{
							rejectionForm.reason().errors()[0]?.message
						}}</ui-field-error>
					}
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
					form="reject-request-form"
					[disabled]="busy()"
				>
					{{ busy() ? "Rejecting…" : "Reject request" }}
				</button>
			</ng-container>
		</ui-dialog>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDataRequestRejectDialog {
	readonly subheading = input<string | null>(null);
	readonly busy = input(false);
	readonly submitted = output<string>();
	readonly cancelled = output<void>();

	protected readonly maxLength = REJECTION_REASON_MAX_LENGTH;
	protected readonly rejection = signal({ reason: "" });
	protected readonly rejectionForm = form(this.rejection, path => {
		required(path.reason, { message: REASON_REQUIRED_MESSAGE });
		validate(path.reason, ({ value }) =>
			value() && !value().trim()
				? { kind: "blankReason", message: REASON_REQUIRED_MESSAGE }
				: null
		);
		maxLength(path.reason, REJECTION_REASON_MAX_LENGTH, {
			message: `Keep the reason to ${REJECTION_REASON_MAX_LENGTH} characters or fewer.`
		});
	});

	protected submit(event: Event) {
		event.preventDefault();
		if (this.busy()) return;
		if (this.rejectionForm().invalid()) {
			this.rejectionForm().markAsTouched();
			return;
		}
		this.submitted.emit(this.rejection().reason.trim());
	}
}
