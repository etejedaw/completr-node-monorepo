import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	type OnInit,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { ListCard } from "../../../../shared/components/list-card/list-card";
import {
	UiButton,
	UiEmptyState,
	UiEyebrow,
	UiLoadError,
	UiPagination,
	UiSkeleton
} from "../../../../shared/ui";
import { injectLatestLoader } from "../../../../shared/utils/inject-latest-loader";
import { ListsService } from "../../lists";
import { type ListsPage } from "../../lists.model";
import {
	type PublicListsKind,
	type PublicListsSectionCopy
} from "./public-lists-section.model";

const SECTION_COPY: Record<PublicListsKind, PublicListsSectionCopy> = {
	official: {
		heading: "Official",
		hint: "Curated by the Completr team.",
		pageSize: 6,
		loadingLabel: "Loading official lists",
		errorTitle: "Couldn't load official lists",
		hiddenWhenEmpty: true
	},
	community: {
		heading: "Community",
		hint: "Public lists from other players, newest first.",
		pageSize: 12,
		loadingLabel: "Loading community lists",
		errorTitle: "Couldn't load community lists",
		hiddenWhenEmpty: false
	}
};

const SKELETON_CARD_COUNT = 3;

@Component({
	selector: "app-public-lists-section",
	imports: [
		RouterLink,
		ListCard,
		UiButton,
		UiEmptyState,
		UiEyebrow,
		UiLoadError,
		UiPagination,
		UiSkeleton
	],
	templateUrl: "./public-lists-section.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicListsSection implements OnInit {
	private readonly listsService = inject(ListsService);
	protected readonly loader = injectLatestLoader();

	readonly kind = input.required<PublicListsKind>();

	protected readonly copy = computed(() => SECTION_COPY[this.kind()]);
	protected readonly headingId = computed(
		() => `${this.kind()}-lists-heading`
	);
	protected readonly skeletonRange = Array.from(
		{ length: SKELETON_CARD_COUNT },
		(_, index) => index
	);

	protected readonly page = signal<ListsPage | null>(null);
	protected readonly offset = signal(0);
	protected readonly isLoading = signal(true);

	protected readonly isFirstLoad = computed(
		() => !this.page() && this.isLoading()
	);
	protected readonly isRefreshing = computed(
		() => !!this.page() && this.isLoading()
	);
	protected readonly isHidden = computed(
		() =>
			this.copy().hiddenWhenEmpty &&
			!this.loader.failed() &&
			this.page()?.total === 0
	);

	ngOnInit() {
		this.load();
	}

	protected goToOffset(offset: number) {
		this.offset.set(offset);
		this.load();
	}

	protected load() {
		this.isLoading.set(true);
		this.loader.load(this.fetchPage(), {
			next: page => this.showPage(page),
			error: () => this.isLoading.set(false)
		});
	}

	private fetchPage() {
		const pagination = {
			limit: this.copy().pageSize,
			offset: this.offset()
		};
		return this.kind() === "official"
			? this.listsService.getOfficialPage(pagination)
			: this.listsService.getRecentPage(pagination);
	}

	private showPage(page: ListsPage) {
		const lastPageOffset = this.lastPageOffset(page.total);
		const overshotLastPage =
			page.lists.length === 0 && this.offset() > lastPageOffset;
		if (overshotLastPage) {
			this.goToOffset(lastPageOffset);
			return;
		}
		this.page.set(page);
		this.isLoading.set(false);
	}

	private lastPageOffset(total: number) {
		const pageSize = this.copy().pageSize;
		return Math.max(0, Math.floor((total - 1) / pageSize) * pageSize);
	}
}
