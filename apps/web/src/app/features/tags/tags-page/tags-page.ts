import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
	signal
} from "@angular/core";
import {
	MoodTagsService,
	UpdateTagDto,
	UserTag
} from "../../mood-tags/mood-tags";
import { ToastService } from "../../../core/services/toast";
import { UiButton, UiInput } from "../../../shared/ui";

@Component({
	selector: "app-tags-page",
	imports: [UiButton, UiInput],
	templateUrl: "./tags-page.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export default class TagsPage implements OnInit {
	private readonly moodTagsService = inject(MoodTagsService);
	private readonly toast = inject(ToastService);

	protected readonly tags = signal<UserTag[]>([]);
	protected readonly loading = signal(true);
	protected readonly saving = signal<string | null>(null);
	protected readonly editingTag = signal<string | null>(null);
	protected readonly editName = signal("");
	protected readonly editDescription = signal("");
	protected readonly creating = signal(false);
	protected readonly newName = signal("");
	protected readonly newDescription = signal("");
	protected readonly submittingNew = signal(false);

	openCreate() {
		this.creating.set(true);
		this.newName.set("");
		this.newDescription.set("");
	}

	cancelCreate() {
		this.creating.set(false);
		this.newName.set("");
		this.newDescription.set("");
	}

	commitCreate() {
		const tag = this.newName().trim();
		if (!tag) return;
		const description = this.newDescription().trim();
		this.submittingNew.set(true);
		this.moodTagsService
			.createTag({
				tag,
				description: description || null
			})
			.subscribe({
				next: () => {
					this.submittingNew.set(false);
					this.cancelCreate();
					this.toast.success("Tag created.");
					this.load();
				},
				error: err => {
					this.submittingNew.set(false);
					this.toast.error(err.error?.title ?? "Create failed");
				}
			});
	}

	ngOnInit() {
		this.load();
	}

	private load() {
		this.loading.set(true);
		this.moodTagsService.getMyTags().subscribe({
			next: tags => {
				this.tags.set(tags);
				this.loading.set(false);
			},
			error: () => this.loading.set(false)
		});
	}

	startEdit(tag: UserTag) {
		this.editingTag.set(tag.tag);
		this.editName.set(tag.tag);
		this.editDescription.set(tag.description ?? "");
	}

	cancelEdit() {
		this.editingTag.set(null);
		this.editName.set("");
		this.editDescription.set("");
	}

	commitEdit(tag: UserTag) {
		const newName = this.editName().trim();
		const newDesc = this.editDescription();
		if (!newName) return;

		const dto: UpdateTagDto = {};
		if (newName !== tag.tag) dto.newTag = newName;
		const currentDesc = tag.description ?? "";
		if (newDesc !== currentDesc) {
			dto.description = newDesc.trim() ? newDesc.trim() : null;
		}
		if (Object.keys(dto).length === 0) {
			this.cancelEdit();
			return;
		}

		this.saving.set(tag.tag);
		this.moodTagsService.updateTag(tag.tag, dto).subscribe({
			next: () => {
				this.saving.set(null);
				this.cancelEdit();
				this.toast.success("Tag updated.");
				this.load();
			},
			error: err => {
				this.saving.set(null);
				this.toast.error(err.error?.title ?? "Update failed");
			}
		});
	}

	protected readonly pendingDelete = signal<UserTag | null>(null);

	requestDelete(tag: UserTag) {
		this.pendingDelete.set(tag);
	}

	cancelDelete() {
		this.pendingDelete.set(null);
	}

	confirmDelete() {
		const tag = this.pendingDelete();
		if (!tag) return;
		this.saving.set(tag.tag);
		this.moodTagsService.deleteTag(tag.tag).subscribe({
			next: () => {
				this.saving.set(null);
				this.pendingDelete.set(null);
				this.toast.success("Tag deleted.");
				this.load();
			},
			error: err => {
				this.saving.set(null);
				this.pendingDelete.set(null);
				this.toast.error(err.error?.title ?? "Delete failed");
			}
		});
	}
}
