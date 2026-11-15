import { type HttpErrorResponse } from "@angular/common/http";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	input,
	linkedSignal,
	output,
	signal,
	untracked
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
	type FieldTree,
	form,
	FormField,
	validate
} from "@angular/forms/signals";
import { map, type Observable } from "rxjs";

import { adminErrorMessage } from "../../../../core/utils/admin-error-message";
import {
	UiAlert,
	UiButton,
	UiDateRangePicker,
	UiDescription,
	UiDialog,
	UiFieldError,
	UiFieldLabel,
	UiFormField,
	UiInput,
	UiLabel,
	UiOptionPicker,
	type UiPickerOption
} from "../../../../shared/ui";
import { type RewindEdition } from "../../services/rewind-admin.model";
import { RewindAdminService } from "../../services/rewind-admin.service";
import {
	type RewindEditionDateField,
	type RewindEditionDialogMode,
	type RewindEditionDialogStep,
	type RewindEditionFieldErrors,
	type RewindEditionFormModel,
	type RewindEditionSaved,
	type RewindEditionServerError,
	type RewindEditionServerErrorField
} from "../admin-rewind.model";
import { AdminRewindEditionConfirm } from "../admin-rewind-edition-confirm/admin-rewind-edition-confirm";
import { AdminRewindEditionSummary } from "../admin-rewind-edition-summary/admin-rewind-edition-summary";
import {
	editionToModel,
	emptyEditionModel,
	graceError,
	modelToCreateRequest,
	modelToSettings,
	periodError,
	regenerationsError,
	REWIND_DATES_TIME_ZONE_LABEL,
	yearError
} from "../admin-rewind-editions";

const EDITION_GONE_ERROR_TYPES: ReadonlySet<unknown> = new Set([
	"REWIND_EDITION_FROZEN",
	"REWIND_EDITION_NOT_FOUND"
]);

const FIELD_OF_ERROR_TYPE: Readonly<
	Record<string, RewindEditionServerErrorField>
> = {
	REWIND_EDITION_EXISTS: "year",
	REWIND_EDITION_OVERLAP: "period"
};

const OFFLINE_MESSAGE =
	"You seem to be offline. Check your connection and try again.";
const SAVE_FAILED_MESSAGE = "Could not save the edition. Try again.";

function visibleErrorOf(field: FieldTree<string>): string | null {
	const state = field();
	return state.touched() && state.invalid()
		? (state.errors()[0]?.message ?? null)
		: null;
}

function validateRegenerations({ value }: { value: () => string }) {
	const message = regenerationsError(value());
	return message ? { kind: "regenerations", message } : null;
}

function snapshotOf(
	field: RewindEditionServerErrorField,
	model: RewindEditionFormModel
): string {
	return field === "year"
		? model.year.trim()
		: `${model.opensAt}|${model.closesAt}`;
}

@Component({
	selector: "app-admin-rewind-edition-dialog",
	imports: [
		AdminRewindEditionConfirm,
		AdminRewindEditionSummary,
		FormField,
		UiOptionPicker,
		UiAlert,
		UiButton,
		UiDateRangePicker,
		UiDescription,
		UiDialog,
		UiFieldError,
		UiFieldLabel,
		UiFormField,
		UiInput,
		UiLabel
	],
	templateUrl: "./admin-rewind-edition-dialog.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminRewindEditionDialog {
	readonly mode = input.required<RewindEditionDialogMode>();
	readonly editions = input<readonly RewindEdition[]>([]);
	readonly designs = input<readonly string[]>([]);
	readonly saved = output<RewindEditionSaved>();
	readonly gone = output<string>();
	readonly closed = output<void>();

	private readonly rewindAdminService = inject(RewindAdminService);
	private readonly destroyRef = inject(DestroyRef);

	protected readonly datesTimeZoneLabel = REWIND_DATES_TIME_ZONE_LABEL;
	protected readonly step = signal<RewindEditionDialogStep>("form");
	protected readonly isSaving = signal(false);
	protected readonly applyToGenerated = signal(false);
	protected readonly dialogError = signal("");
	protected readonly serverError = signal<RewindEditionServerError | null>(
		null
	);

	protected readonly model = linkedSignal<
		RewindEditionDialogMode,
		RewindEditionFormModel
	>({
		source: this.mode,
		computation: mode =>
			mode.kind === "edit"
				? editionToModel(mode.edition)
				: untracked(() =>
						emptyEditionModel(this.editions(), this.designs())
					)
	});
	protected readonly editionForm = form(this.model, path => {
		validate(path.year, ({ value }) => {
			if (this.mode().kind !== "create") return null;
			const message = yearError(value());
			return message ? { kind: "year", message } : null;
		});
		validate(path.closesAt, ({ value, valueOf }) => {
			const message = periodError(valueOf(path.opensAt), value());
			return message ? { kind: "period", message } : null;
		});
		validate(path.graceEndsAt, ({ value, valueOf }) => {
			const message = graceError({
				opensAt: valueOf(path.opensAt),
				closesAt: valueOf(path.closesAt),
				graceStartsAt: valueOf(path.graceStartsAt),
				graceEndsAt: value()
			});
			return message ? { kind: "grace", message } : null;
		});
		validate(path.design, ({ value }) =>
			this.designs().includes(value())
				? null
				: { kind: "design", message: "Choose a design." }
		);
		validate(path.premiumRegenerations, validateRegenerations);
		validate(path.giftRegenerations, validateRegenerations);
	});

	protected readonly edition = computed(() => {
		const mode = this.mode();
		return mode.kind === "edit" ? mode.edition : null;
	});
	protected readonly isReadOnly = computed(() => !!this.edition()?.frozenAt);
	protected readonly heading = computed(() => {
		const edition = this.edition();
		if (!edition) return "New Rewind edition";
		return this.isReadOnly()
			? `Rewind ${edition.year}`
			: `Edit Rewind ${edition.year}`;
	});
	protected readonly subheading = computed(() => {
		const edition = this.edition();
		if (!edition)
			return "The year can't be changed after the edition is created.";
		if (this.isReadOnly())
			return "This edition is frozen. Its Rewinds keep the version from the close.";
		return edition.inProgress
			? "This edition is in progress."
			: "Changes apply from the next time a Rewind is read or generated.";
	});
	protected readonly designOptions = computed<UiPickerOption[]>(() =>
		this.designs().map(design => ({
			value: design,
			label: `Design ${design}`,
			icon: "palette"
		}))
	);
	protected readonly fieldErrors = computed<RewindEditionFieldErrors>(() => ({
		year:
			visibleErrorOf(this.editionForm.year) ??
			this.visibleServerError("year"),
		period:
			visibleErrorOf(this.editionForm.closesAt) ??
			this.visibleServerError("period"),
		grace: visibleErrorOf(this.editionForm.graceEndsAt),
		design: visibleErrorOf(this.editionForm.design),
		premiumRegenerations: visibleErrorOf(
			this.editionForm.premiumRegenerations
		),
		giftRegenerations: visibleErrorOf(this.editionForm.giftRegenerations)
	}));

	protected setDateField(field: RewindEditionDateField, value: string) {
		this.editionForm[field]().value.set(value);
	}

	protected touchField(field: RewindEditionDateField) {
		this.editionForm[field]().markAsTouched();
	}

	protected setDesign(design: string) {
		const field = this.editionForm.design();
		field.value.set(design);
		field.markAsTouched();
	}

	protected close() {
		if (this.isSaving()) return;
		this.closed.emit();
	}

	protected backToForm() {
		if (this.isSaving()) return;
		this.step.set("form");
	}

	protected submit(event?: Event) {
		event?.preventDefault();
		if (this.isSaving() || this.isReadOnly()) return;
		if (this.editionForm().invalid()) {
			this.editionForm().markAsTouched();
			return;
		}
		if (this.edition()?.inProgress && this.step() === "form") {
			this.applyToGenerated.set(false);
			this.step.set("confirm");
			return;
		}
		this.save();
	}

	protected confirm() {
		if (this.isSaving()) return;
		this.save();
	}

	private save() {
		const model = this.model();
		const edition = this.edition();
		this.isSaving.set(true);
		this.dialogError.set("");
		this.serverError.set(null);
		const applyToGenerated =
			!!edition?.inProgress && this.applyToGenerated();
		const request: Observable<RewindEditionSaved> = edition
			? this.rewindAdminService
					.updateEdition(edition.year, {
						...modelToSettings(model),
						...(edition.inProgress ? { applyToGenerated } : {})
					})
					.pipe(
						map(result => ({
							edition: result.edition,
							affectedRewinds: applyToGenerated
								? result.affectedRewinds
								: null
						}))
					)
			: this.rewindAdminService
					.createEdition(modelToCreateRequest(model))
					.pipe(
						map(created => ({
							edition: created,
							affectedRewinds: null
						}))
					);
		request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: result => {
				this.isSaving.set(false);
				this.saved.emit(result);
			},
			error: (failure: HttpErrorResponse) => {
				this.isSaving.set(false);
				this.handleError(failure, model);
			}
		});
	}

	private handleError(
		failure: HttpErrorResponse,
		model: RewindEditionFormModel
	) {
		const type: unknown = failure.error?.type;
		const message = adminErrorMessage(failure);
		if (message && EDITION_GONE_ERROR_TYPES.has(type)) {
			this.gone.emit(message);
			return;
		}
		this.step.set("form");
		const field =
			typeof type === "string" ? FIELD_OF_ERROR_TYPE[type] : undefined;
		if (message && field) {
			this.setServerError(field, message, model);
			return;
		}
		this.dialogError.set(
			message ??
				(failure.status === 0 ? OFFLINE_MESSAGE : SAVE_FAILED_MESSAGE)
		);
	}

	private setServerError(
		field: RewindEditionServerErrorField,
		message: string,
		model: RewindEditionFormModel
	) {
		this.serverError.set({
			field,
			message,
			submitted: snapshotOf(field, model)
		});
	}

	private visibleServerError(field: RewindEditionServerErrorField) {
		const error = this.serverError();
		if (error?.field !== field) return null;
		return snapshotOf(field, this.model()) === error.submitted
			? error.message
			: null;
	}
}
