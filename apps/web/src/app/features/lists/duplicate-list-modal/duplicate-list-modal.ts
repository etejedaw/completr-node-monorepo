import {
	ChangeDetectionStrategy,
	Component,
	inject,
	signal
} from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
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
		ReactiveFormsModule,
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
	private readonly fb = inject(FormBuilder);
	private readonly listsService = inject(ListsService);
	private readonly dialogRef = injectDialogRef<
		DuplicateListModalData,
		DuplicateListModalResult
	>();
	private readonly source = this.dialogRef.data.list;

	protected readonly isLoading = signal(false);
	protected readonly error = signal("");

	form = this.fb.group({
		name: [
			`${this.source.name} (copy)`,
			[Validators.required, Validators.maxLength(100)]
		],
		isPublic: [false]
	});

	onSubmit() {
		if (this.form.invalid) return;
		this.isLoading.set(true);
		this.error.set("");

		const val = this.form.getRawValue();
		this.listsService
			.duplicate(this.source.id, {
				name: val.name!,
				isPublic: val.isPublic ?? false
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
