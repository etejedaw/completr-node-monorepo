import { type HttpErrorResponse } from "@angular/common/http";
import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	inject,
	output,
	signal
} from "@angular/core";
import { form, FormField, maxLength, validate } from "@angular/forms/signals";

import { MoodTagsService } from "../../../core/services/mood-tags";
import { isToastedByErrorInterceptor } from "../../../core/utils/toasted-error-statuses";
import { AppearancePicker } from "../../../shared/components/appearance-picker/appearance-picker";
import { DEFAULT_TAG_ICON } from "../../../shared/constants/mood-tags";
import {
	UiAlert,
	UiButton,
	UiDescription,
	UiDialog,
	UiFieldError,
	UiFieldLabel,
	UiFieldOptional,
	UiFormField,
	UiInput,
	UiLabel
} from "../../../shared/ui";

const TAG_NAME_MAX_LENGTH = 40;
const TAG_DESCRIPTION_MAX_LENGTH = 255;

@Component({
	selector: "app-tag-create-dialog",
	imports: [
		UiAlert,
		UiFieldLabel,
		UiFieldOptional,
		FormField,
		UiButton,
		UiDescription,
		UiDialog,
		UiFormField,
		UiInput,
		UiLabel,
		UiFieldError,
		AppearancePicker
	],
	templateUrl: "./tag-create-dialog.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class TagCreateDialog {
	readonly created = output<void>();
	readonly closed = output<void>();

	private readonly moodTagsService = inject(MoodTagsService);

	protected readonly submitting = signal(false);
	protected readonly error = signal("");

	protected readonly model = signal({ name: "", description: "" });
	protected readonly icon = signal<string | null>(null);
	protected readonly color = signal<string | null>(null);
	protected readonly defaultIcon = DEFAULT_TAG_ICON;

	protected readonly form = form(this.model, path => {
		validate(path.name, ({ value }) =>
			value().trim()
				? null
				: { kind: "required", message: "Give the tag a name." }
		);
		maxLength(path.name, TAG_NAME_MAX_LENGTH, {
			message: `Use ${TAG_NAME_MAX_LENGTH} characters or fewer.`
		});
		maxLength(path.description, TAG_DESCRIPTION_MAX_LENGTH, {
			message: `Use ${TAG_DESCRIPTION_MAX_LENGTH} characters or fewer.`
		});
	});

	constructor() {
		afterNextRender(() => this.form.name().focusBoundControl());
	}

	protected submit(event: Event) {
		event.preventDefault();
		if (this.submitting()) return;
		this.form().markAsTouched();
		if (this.form().invalid()) {
			const firstInvalid = this.form.name().invalid()
				? this.form.name
				: this.form.description;
			firstInvalid().focusBoundControl();
			return;
		}
		const description = this.model().description.trim();
		this.submitting.set(true);
		this.error.set("");
		this.moodTagsService
			.createTag({
				tag: this.model().name.trim(),
				description: description || null,
				icon: this.icon(),
				color: this.color()
			})
			.subscribe({
				next: () => {
					this.submitting.set(false);
					this.created.emit();
				},
				error: (err: HttpErrorResponse) => {
					this.submitting.set(false);
					if (!isToastedByErrorInterceptor(err.status))
						this.error.set(
							err.error?.title ?? "Couldn't create the tag."
						);
				}
			});
	}

	protected close() {
		if (!this.submitting()) this.closed.emit();
	}
}
