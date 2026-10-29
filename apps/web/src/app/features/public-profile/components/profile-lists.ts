import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { type Params } from "@angular/router";
import { catchError, forkJoin, of } from "rxjs";

import { ViewportService } from "../../../core/services/viewport";
import { ListCard } from "../../../shared/components/list-card/list-card";
import { UiSkeleton } from "../../../shared/ui";
import {
	type PublicList,
	type PublicListsPage,
	PublicListsService
} from "../services/public-lists.service";
import { type ProfileListsTab } from "../user-lists/user-lists-tab";
import { ProfileSectionHeader } from "./profile-section-header";

const COLLAPSED_LIST_COUNT = 6;
const COLLAPSED_LIST_COUNT_MOBILE = 3;
const EMPTY_PAGE: PublicListsPage = { items: [], total: 0 };

interface ListGroup {
	tab: ProfileListsTab;
	title: string;
	items: PublicList[];
	total: number;
}

@Component({
	selector: "app-profile-lists",
	imports: [ListCard, ProfileSectionHeader, UiSkeleton],
	templateUrl: "./profile-lists.html",
	host: { class: "block empty:hidden" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileLists {
	private readonly listsService = inject(PublicListsService);
	private readonly isMobile = inject(ViewportService).isMobile;

	readonly username = input.required<string>();
	readonly isSelf = input(false);

	private readonly lists = rxResource({
		params: () => this.username(),
		stream: ({ params: username }) => {
			const query = { limit: COLLAPSED_LIST_COUNT };
			return forkJoin({
				created: this.listsService
					.getUserLists(username, query)
					.pipe(catchError(() => of(EMPTY_PAGE))),
				following: this.listsService
					.getUserFollowingLists(username, query)
					.pipe(catchError(() => of(EMPTY_PAGE)))
			});
		}
	});

	protected readonly isLoading = this.lists.isLoading;
	protected readonly skeletonRange = [0, 1, 2];

	protected readonly groups = computed<ListGroup[]>(() => {
		if (!this.lists.hasValue()) return [];
		const { created, following } = this.lists.value();
		const groups: ListGroup[] = [
			{ tab: "created", title: "Created", ...created },
			{ tab: "following", title: "Following", ...following }
		];
		return groups.filter(group => group.items.length > 0);
	});

	private readonly collapsedCount = computed(() =>
		this.isMobile() ? COLLAPSED_LIST_COUNT_MOBILE : COLLAPSED_LIST_COUNT
	);

	private readonly overflowingGroup = computed(() =>
		this.groups().find(group => group.total > this.collapsedCount())
	);

	protected readonly seeAllLink = computed(() =>
		this.overflowingGroup() ? ["/user", this.username(), "lists"] : null
	);

	protected readonly seeAllQueryParams = computed<Params | null>(() =>
		this.overflowingGroup()?.tab === "following"
			? { tab: "following" }
			: null
	);

	protected visibleItems(group: ListGroup): PublicList[] {
		return group.items.slice(0, this.collapsedCount());
	}
}
