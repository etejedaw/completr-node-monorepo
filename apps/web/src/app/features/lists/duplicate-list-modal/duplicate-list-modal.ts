import {
	ChangeDetectionStrategy,
	Component,
	inject,
	signal
} from "@angular/core";
import { form, required, maxLength, FormField } from "@angular/forms/signals";
import {
	NgpDialog,
	NgpDialogOverlay,
	NgpDialogTitle,
	injectDialogRef
} from "ng-primitives/dialog";
import { List } from "../../../core/models";
import { ListsService } from "../lists";
import {
	UiButton,
	UiFormField,
	UiIconButton,
	UiInput,
	UiLabel
} from "../../../shared/ui";

export interface DuplicateListModalData {
	list: List;
}
export type DuplicateListModalResult = List | null;

@Component({
	selector: "app-duplicate-list-modal",
	imports: [
		FormField,
		NgpDialog,
		NgpDialogOverlay,
		NgpDialogTitle,
		UiButton,
		UiIconButton,
		UiInput,
		UiFormField,
		UiLabel
	],
	templateUrl: "./duplicate-list-modal.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class DuplicateListModal {
	private readonly listsService = inject(ListsService);
	private readonly dialogRef = injectDialogRef<
		DuplicateListModalData,
		DuplicateListModalResult
	>();
	private readonly source = this.dialogRef.data.list;

	protected readonly isLoading = signal(false);
	protected readonly error = signal("");

	protected readonly model = signal({
		name: `${this.source.name} (copy)`,
		isPublic: false
	});

	readonly form = form(this.model, path => {
		required(path.name);
		maxLength(path.name, 100);
	});

	onSubmit(event: Event) {
		event.preventDefault();
		if (this.form().invalid()) return;
		this.isLoading.set(true);
		this.error.set("");

		const val = this.form().value();
		this.listsService
			.duplicate(this.source.id, {
				name: val.name,
				isPublic: val.isPublic
			})
			.subscribe({
				next: list => this.dialogRef.close(list),
				error: err => {
					this.isLoading.set(false);
					this.error.set(err.error?.title ?? "Duplicate failed");
				}
			});
	}

	onClose() {
		this.dialogRef.close(null);
	}
}
