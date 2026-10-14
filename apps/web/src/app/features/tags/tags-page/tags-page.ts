import { type HttpErrorResponse } from "@angular/common/http";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { Router } from "@angular/router";

import { AuthService } from "../../../core/services/auth";
import { ToastService } from "../../../core/services/toast";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../../shared/components/library-toolbar/library-toolbar";
import {
	OptionPicker,
	type PickerOption
} from "../../../shared/components/option-picker/option-picker";
import { PremiumOnly } from "../../../shared/directives/premium-only";
import {
	UiBottomSheet,
	UiButton,
	UiDialog,
	UiEmptyState,
	UiNoMatches,
	UiPremiumBadge,
	UiSearchBar,
	UiSkeleton
} from "../../../shared/ui";
import { injectLibraryPosters } from "../../backlog/library-posters";
import {
	MoodTagsService,
	type UpdateTagDto,
	type UserTag
} from "../../mood-tags/mood-tags";
import { TagCreateDialog } from "../tag-create-dialog/tag-create-dialog";
import { isCentrallyNotified } from "../tag-errors";
import { type TagEdit, TagRow } from "../tag-row/tag-row";

type TagSort = "usage" | "name";

const SORT_PICKER_OPTIONS: readonly (PickerOption & { value: TagSort })[] = [
	{ value: "usage", label: "Most used", icon: "trending_up" },
	{ value: "name", label: "Name (A–Z)", icon: "sort_by_alpha" }
];

type SheetActionId = "games" | "edit" | "delete";

const SHEET_ACTIONS: {
	id: SheetActionId;
	icon: string;
	label: string;
	danger: boolean;
}[] = [
	{
		id: "games",
		icon: "videogame_asset",
		label: "Show in My Games",
		danger: false
	},
	{ id: "edit", icon: "edit", label: "Edit", danger: false },
	{ id: "delete", icon: "delete", label: "Delete", danger: true }
];

@Component({
	selector: "app-tags-page",
	imports: [
		LibraryHero,
		LibraryToolbar,
		OptionPicker,
		TagCreateDialog,
		TagRow,
		UiBottomSheet,
		UiButton,
		UiEmptyState,
		UiNoMatches,
		UiSearchBar,
		UiSkeleton,
		UiDialog,
		PremiumOnly,
		UiPremiumBadge
	],
	templateUrl: "./tags-page.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export default class TagsPage implements OnInit {
	private readonly moodTagsService = inject(MoodTagsService);
	private readonly toast = inject(ToastService);
	private readonly router = inject(Router);
	protected readonly isPremium = inject(AuthService).isPremium;

	protected readonly tags = signal<UserTag[]>([]);
	protected readonly loading = signal(true);
	protected readonly saving = signal<string | null>(null);
	protected readonly editingTag = signal<string | null>(null);
	protected readonly creating = signal(false);
	protected readonly searchQuery = signal("");
	protected readonly sortBy = signal<TagSort>("usage");
	protected readonly sortPickerOptions = SORT_PICKER_OPTIONS;
	protected readonly sheetActions = SHEET_ACTIONS;
	protected readonly actionSheetTag = signal<UserTag | null>(null);
	protected readonly skeletonRange = [0, 1, 2, 3, 4];
	protected readonly heroPosters = injectLibraryPosters();

	protected readonly totalUsage = computed(() =>
		this.tags().reduce((sum, tag) => sum + tag.usageCount, 0)
	);
	protected readonly maxUsage = computed(() =>
		Math.max(1, ...this.tags().map(tag => tag.usageCount))
	);
	protected readonly visibleTags = computed(() => {
		const query = this.searchQuery().trim().toLowerCase();
		const matches = query
			? this.tags().filter(
					tag =>
						tag.tag.toLowerCase().includes(query) ||
						(tag.description ?? "").toLowerCase().includes(query)
				)
			: [...this.tags()];
		return this.sortBy() === "name"
			? matches.sort((a, b) => a.tag.localeCompare(b.tag))
			: matches.sort(
					(a, b) =>
						b.usageCount - a.usageCount ||
						a.tag.localeCompare(b.tag)
				);
	});

	runSheetAction(tag: UserTag, id: SheetActionId) {
		this.actionSheetTag.set(null);
		if (id === "games") {
			this.router.navigate(["/backlog"], {
				queryParams: { mood_tags: tag.tag }
			});
		} else if (id === "edit") this.startEdit(tag);
		else this.requestDelete(tag);
	}

	onTagCreated() {
		this.creating.set(false);
		this.toast.success("Tag created.");
		this.load();
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
	}

	cancelEdit() {
		this.editingTag.set(null);
	}

	commitEdit(tag: UserTag, edit: TagEdit) {
		const dto: UpdateTagDto = {};
		if (edit.name !== tag.tag) dto.newTag = edit.name;
		const description = edit.description.trim();
		if (description !== (tag.description ?? "")) {
			dto.description = description || null;
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
			error: (err: HttpErrorResponse) => {
				this.saving.set(null);
				if (!isCentrallyNotified(err))
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
			error: (err: HttpErrorResponse) => {
				this.saving.set(null);
				this.pendingDelete.set(null);
				if (!isCentrallyNotified(err))
					this.toast.error(err.error?.title ?? "Delete failed");
			}
		});
	}
}
