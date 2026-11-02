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

import { ScoreSourcesService } from "../../../core/services/score-sources";
import { ChipGroup } from "../../../shared/components/chip-group/chip-group";
import { DialogDeleteAction } from "../../../shared/components/dialog-delete-action/dialog-delete-action";
import {
	UiAlert,
	UiButton,
	UiDescription,
	UiDialog,
	UiFieldLabel,
	UiFormField,
	UiInput,
	UiLabel,
	UiSwitch,
	UiTextarea
} from "../../../shared/ui";
import { ListsService } from "../lists";
import { type CreateListDto, type UpdateListDto } from "../lists.model";
import {
	type ListModalData,
	type ListModalResult,
	type SourceField,
	type SourceGroup,
	type SourceOption
} from "./list-modal.model";

const DURATION_SOURCES: readonly SourceOption[] = [
	{ value: "hltb", label: "HLTB" },
	{ value: "rawg", label: "RAWG" },
	{ value: "completr", label: "Completr" }
];

@Component({
	selector: "app-list-modal",
	imports: [
		UiAlert,
		UiFieldLabel,
		ChipGroup,
		DialogDeleteAction,
		FormField,
		UiButton,
		UiDescription,
		UiDialog,
		UiInput,
		UiTextarea,
		UiFormField,
		UiLabel,
		UiSwitch
	],
	templateUrl: "./list-modal.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListModal implements OnInit {
	private readonly scoreSourcesService = inject(ScoreSourcesService);
	private readonly scoreSourceOptions = computed(() =>
		this.scoreSourcesService
			.sources()
			.map(source => ({ value: source.code, label: source.name }))
	);
	protected readonly sourceGroups = computed<SourceGroup[]>(() => [
		this.sourceGroup(
			"scoreSource",
			"Score source",
			this.scoreSourceOptions()
		),
		this.sourceGroup("durationSource", "Duration source", DURATION_SOURCES)
	]);

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

	protected setSource(field: SourceField, values: readonly string[]) {
		const [value] = values;
		if (value) this.form[field]().value.set(value);
	}

	private sourceGroup(
		field: SourceField,
		label: string,
		options: readonly SourceOption[]
	): SourceGroup {
		const selected = this.form[field]().value();
		return {
			field,
			label,
			selected: [selected],
			options: options.map(option =>
				option.value === selected
					? { ...option, icon: "check" }
					: option
			)
		};
	}

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
				next: () => this.dialogRef.close({ status: "saved" }),
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
				next: list => this.dialogRef.close({ status: "created", list }),
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
			next: () => this.dialogRef.close({ status: "deleted" }),
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
