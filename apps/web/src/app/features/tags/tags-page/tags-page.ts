import { type HttpErrorResponse } from "@angular/common/http";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { Router, RouterLink } from "@angular/router";

import { AuthService } from "../../../core/services/auth";
import { ToastService } from "../../../core/services/toast";
import { isToastedByErrorInterceptor } from "../../../core/utils/toasted-error-statuses";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../../shared/components/library-toolbar/library-toolbar";
import { PageSearch } from "../../../shared/components/page-search/page-search";
import { PremiumOnly } from "../../../shared/directives/premium-only";
import {
	UiBadge,
	UiButton,
	UiDialog,
	UiEmptyState,
	UiIconButton,
	UiLoadError,
	UiNoMatches,
	UiOptionPicker,
	type UiPickerOption,
	UiPremiumBadge,
	UiSkeleton
} from "../../../shared/ui";
import { injectLatestLoader } from "../../../shared/utils/inject-latest-loader";
import { injectLibraryPosters } from "../../backlog/library-posters";
import { injectTagListSync } from "../../mood-tags/inject-tag-list-sync";
import { MoodTagsService } from "../../mood-tags/mood-tags";
import { MAX_FAVORITE_TAGS } from "../../mood-tags/mood-tags.constants";
import {
	type PopularTag,
	type UpdateTagDto,
	type UserTag
} from "../../mood-tags/mood-tags.model";
import { TagCreateDialog } from "../tag-create-dialog/tag-create-dialog";
import { TagRow } from "../tag-row/tag-row";
import { type TagEdit } from "../tag-row/tag-row.model";

type TagSort = "usage" | "name";

const POPULAR_TAGS_SHOWN = 30;

function favoriteTagsOf(tags: readonly UserTag[]) {
	return tags
		.filter(tag => tag.favoriteOrder !== null)
		.sort((a, b) => (a.favoriteOrder ?? 0) - (b.favoriteOrder ?? 0))
		.map(tag => tag.tag);
}

const SORT_PICKER_OPTIONS: readonly (UiPickerOption & { value: TagSort })[] = [
	{ value: "usage", label: "Most used", icon: "trending_up" },
	{ value: "name", label: "Name (A–Z)", icon: "sort_by_alpha" }
];

@Component({
	selector: "app-tags-page",
	imports: [
		LibraryHero,
		LibraryToolbar,
		UiOptionPicker,
		TagCreateDialog,
		TagRow,
		UiBadge,
		UiButton,
		UiEmptyState,
		UiIconButton,
		UiLoadError,
		UiNoMatches,
		UiSkeleton,
		UiDialog,
		PremiumOnly,
		UiPremiumBadge,
		PageSearch,
		RouterLink
	],
	templateUrl: "./tags-page.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export default class TagsPage implements OnInit {
	private readonly moodTagsService = inject(MoodTagsService);
	protected readonly tagsLoader = injectLatestLoader();
	protected readonly popularLoader = injectLatestLoader();
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
	protected readonly skeletonRange = [0, 1, 2, 3, 4];
	protected readonly heroPosters = injectLibraryPosters();
	protected readonly maxFavorites = MAX_FAVORITE_TAGS;
	protected readonly popularTags = signal<PopularTag[]>([]);
	protected readonly popularLoading = signal(true);
	protected readonly favoritesAnnouncement = signal("");

	protected readonly favorites = injectTagListSync({
		save: tags => this.moodTagsService.replaceFavoriteTags(tags),
		failureMessage: "Couldn't save your favorite tags. Try again.",
		onFailed: () =>
			this.favoritesAnnouncement.set("Your favorite tags weren't saved.")
	});
	protected readonly favoriteSet = computed(
		() => new Set(this.favorites.desired())
	);
	protected readonly favoritesFull = computed(
		() => this.favorites.desired().length >= MAX_FAVORITE_TAGS
	);

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

	showInMyGames(tag: UserTag) {
		this.router.navigate(["/backlog"], {
			queryParams: { mood_tags: tag.tag }
		});
	}

	onTagCreated() {
		this.creating.set(false);
		this.toast.success("Tag created.");
		this.load();
	}

	ngOnInit() {
		this.load();
		this.loadPopular();
	}

	protected load() {
		this.loading.set(true);
		this.tagsLoader.load(this.moodTagsService.getMyTags(), {
			next: tags => {
				this.tags.set(tags);
				this.favorites.reset(favoriteTagsOf(tags));
				this.loading.set(false);
			},
			error: () => this.loading.set(false)
		});
	}

	protected loadPopular() {
		this.popularLoading.set(true);
		this.popularLoader.load(
			this.moodTagsService.getPopularTags(POPULAR_TAGS_SHOWN),
			{
				next: tags => {
					this.popularTags.set(tags);
					this.popularLoading.set(false);
				},
				error: () => this.popularLoading.set(false)
			}
		);
	}

	protected toggleFavorite(tag: string) {
		if (this.favorites.isPending(tag)) return;
		const current = this.favorites.desired();
		if (current.includes(tag)) {
			this.favorites.set(current.filter(item => item !== tag));
			this.favoritesAnnouncement.set(`Removed ${tag} from favorites.`);
			return;
		}
		if (this.favoritesFull()) return;
		this.favorites.set([...current, tag]);
		this.favoritesAnnouncement.set(`Added ${tag} to favorites.`);
	}

	protected moveFavorite(index: number, step: -1 | 1) {
		const current = [...this.favorites.desired()];
		const target = index + step;
		if (target < 0 || target >= current.length) return;
		[current[index], current[target]] = [current[target], current[index]];
		this.favorites.set(current);
		this.favoritesAnnouncement.set(
			`${current[target]} moved to position ${target + 1} of ${current.length}.`
		);
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
				if (!isToastedByErrorInterceptor(err.status))
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
				if (!isToastedByErrorInterceptor(err.status))
					this.toast.error(err.error?.title ?? "Delete failed");
			}
		});
	}
}
