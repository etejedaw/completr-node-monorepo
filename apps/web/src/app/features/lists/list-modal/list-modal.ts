import {
	ChangeDetectionStrategy,
	Component,
	inject,
	input,
	OnInit,
	output,
	signal
} from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { List } from "../../../core/models";
import { ListsService, CreateListDto, UpdateListDto } from "../lists.service";

@Component({
	selector: "app-list-modal",
	imports: [ReactiveFormsModule],
	templateUrl: "./list-modal.html",
	styleUrl: "./list-modal.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListModal implements OnInit {
	private readonly fb = inject(FormBuilder);
	private readonly listsService = inject(ListsService);

	list = input<List | null>(null);
	closed = output<void>();
	saved = output<void>();

	protected readonly isLoading = signal(false);
	protected readonly error = signal("");
	protected readonly isEdit = signal(false);
	protected readonly showConfirmDelete = signal(false);

	form = this.fb.group({
		name: ["", [Validators.required, Validators.maxLength(100)]],
		description: [""],
		isPublic: [true],
		scoreSource: ["metacritic", Validators.required],
		durationSource: ["hltb", Validators.required]
	});

	ngOnInit() {
		const l = this.list();
		if (l) {
			this.isEdit.set(true);
			this.form.patchValue({
				name: l.name,
				description: l.description ?? "",
				isPublic: l.isPublic,
				scoreSource: l.scoreSource,
				durationSource: l.durationSource
			});
		}
	}

	onSubmit() {
		if (this.form.invalid) return;
		this.isLoading.set(true);
		this.error.set("");

		const val = this.form.getRawValue();

		if (this.isEdit()) {
			const dto: UpdateListDto = {
				name: val.name ?? undefined,
				description: val.description || undefined,
				isPublic: val.isPublic ?? undefined,
				scoreSource: val.scoreSource ?? undefined,
				durationSource: val.durationSource ?? undefined
			};
			this.listsService.update(this.list()!.id, dto).subscribe({
				next: () => this.saved.emit(),
				error: err => {
					this.isLoading.set(false);
					this.error.set(err.error?.title ?? "Update failed");
				}
			});
		} else {
			const dto: CreateListDto = {
				name: val.name!,
				scoreSource: val.scoreSource!,
				durationSource: val.durationSource!,
				description: val.description || undefined,
				isPublic: val.isPublic ?? false
			};
			this.listsService.create(dto).subscribe({
				next: () => this.saved.emit(),
				error: err => {
					this.isLoading.set(false);
					this.error.set(err.error?.title ?? "Creation failed");
				}
			});
		}
	}

	onDelete() {
		this.isLoading.set(true);
		this.listsService.delete(this.list()!.id).subscribe({
			next: () => this.saved.emit(),
			error: err => {
				this.isLoading.set(false);
				this.error.set(err.error?.title ?? "Delete failed");
			}
		});
	}

	onClose() {
		this.closed.emit();
	}
}
