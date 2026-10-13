import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { form, FormField, maxLength, required } from "@angular/forms/signals";
import { injectDialogRef } from "ng-primitives/dialog";

import { type List } from "../../../core/models";
import { ScoreSourcesService } from "../../../core/services/score-sources";
import { DialogDeleteAction } from "../../../shared/components/dialog-delete-action/dialog-delete-action";
import {
	UiButton,
	UiDialog,
	UiFormField,
	UiInput,
	UiLabel,
	UiRadioGroup,
	UiRadioItem,
	UiTextarea
} from "../../../shared/ui";
import { type CreateListDto, ListsService, type UpdateListDto } from "../lists";

export interface ListModalData {
	list: List | null;
}
export type ListModalResult = "saved" | "deleted";

@Component({
	selector: "app-list-modal",
	imports: [
		DialogDeleteAction,
		FormField,
		UiButton,
		UiDialog,
		UiInput,
		UiTextarea,
		UiFormField,
		UiLabel,
		UiRadioGroup,
		UiRadioItem
	],
	templateUrl: "./list-modal.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListModal implements OnInit {
	private readonly scoreSourcesService = inject(ScoreSourcesService);
	protected readonly scoreSourceOptions = computed(() =>
		this.scoreSourcesService
			.sources()
			.map(source => ({ value: source.code, label: source.name }))
	);
	protected readonly DURATION_SOURCES = [
		{ value: "hltb", label: "HLTB" },
		{ value: "rawg", label: "RAWG" },
		{ value: "completr", label: "Completr" }
	] as const;

	private readonly listsService = inject(ListsService);
	private readonly dialogRef = injectDialogRef<
		ListModalData,
		ListModalResult
	>();
	private readonly list = this.dialogRef.data.list;

	protected readonly isLoading = signal(false);
	protected readonly error = signal("");
	protected readonly isEdit = signal(false);

	protected readonly model = signal({
		name: "",
		description: "",
		isPublic: true,
		scoreSource: "metacritic",
		durationSource: "hltb"
	});

	readonly form = form(this.model, path => {
		required(path.name, { message: "Name is required" });
		maxLength(path.name, 100, {
			message: "Name must be 100 characters or fewer"
		});
		required(path.scoreSource);
		required(path.durationSource);
	});

	ngOnInit() {
		this.scoreSourcesService.load();
		const l = this.list;
		if (l) {
			this.isEdit.set(true);
			this.model.set({
				name: l.name,
				description: l.description ?? "",
				isPublic: l.isPublic,
				scoreSource: l.scoreSource,
				durationSource: l.durationSource
			});
		}
	}

	onSubmit(event: Event) {
		event.preventDefault();
		if (this.form().invalid()) return;
		this.isLoading.set(true);
		this.error.set("");

		const val = this.form().value();

		if (this.isEdit()) {
			const dto: UpdateListDto = {
				name: val.name,
				description: val.description || undefined,
				isPublic: val.isPublic,
				scoreSource: val.scoreSource,
				durationSource: val.durationSource
			};
			this.listsService.update(this.list!.id, dto).subscribe({
				next: () => this.dialogRef.close("saved"),
				error: err => {
					this.isLoading.set(false);
					this.error.set(err.error?.title ?? "Update failed");
				}
			});
		} else {
			const dto: CreateListDto = {
				name: val.name,
				scoreSource: val.scoreSource,
				durationSource: val.durationSource,
				description: val.description || undefined,
				isPublic: val.isPublic
			};
			this.listsService.create(dto).subscribe({
				next: () => this.dialogRef.close("saved"),
				error: err => {
					this.isLoading.set(false);
					this.error.set(err.error?.title ?? "Creation failed");
				}
			});
		}
	}

	onDelete() {
		this.isLoading.set(true);
		this.listsService.delete(this.list!.id).subscribe({
			next: () => this.dialogRef.close("deleted"),
			error: err => {
				this.isLoading.set(false);
				this.error.set(err.error?.title ?? "Delete failed");
			}
		});
	}

	onClose() {
		this.dialogRef.close();
	}
}
