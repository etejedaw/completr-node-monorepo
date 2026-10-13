import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	signal
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { catchError, forkJoin, map, of } from "rxjs";

import { ViewportService } from "../../../core/services/viewport";
import { ListCard } from "../../../shared/components/list-card/list-card";
import { UiButton, UiSkeleton } from "../../../shared/ui";
import {
	type PublicList,
	PublicListsService
} from "../services/public-lists.service";
import { ProfileSectionHeader } from "./profile-section-header";

const COLLAPSED_LIST_COUNT = 6;
const COLLAPSED_LIST_COUNT_MOBILE = 3;

interface ListGroup {
	title: string;
	items: PublicList[];
}

@Component({
	selector: "app-profile-lists",
	imports: [ListCard, ProfileSectionHeader, UiButton, UiSkeleton],
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
		stream: ({ params: username }) =>
			forkJoin({
				created: this.listsService.getUserLists(username).pipe(
					map(page => page.items),
					catchError(() => of([]))
				),
				following: this.listsService
					.getUserFollowingLists(username)
					.pipe(
						map(page => page.items),
						catchError(() => of([]))
					)
			})
	});

	protected readonly expanded = signal(false);
	protected readonly isLoading = this.lists.isLoading;
	protected readonly skeletonRange = [0, 1, 2];

	protected readonly groups = computed<ListGroup[]>(() => {
		if (!this.lists.hasValue()) return [];
		const { created, following } = this.lists.value();
		return [
			{ title: "Created", items: created },
			{ title: "Following", items: following }
		].filter(group => group.items.length > 0);
	});

	private readonly collapsedCount = computed(() =>
		this.isMobile() ? COLLAPSED_LIST_COUNT_MOBILE : COLLAPSED_LIST_COUNT
	);

	protected readonly hasHiddenLists = computed(() =>
		this.groups().some(group => group.items.length > this.collapsedCount())
	);

	protected visibleItems(group: ListGroup): PublicList[] {
		return this.expanded()
			? group.items
			: group.items.slice(0, this.collapsedCount());
	}
}
