import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	signal
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import { catchError, forkJoin, map, of } from "rxjs";

import { UiButton, UiProgress, UiSkeleton } from "../../../shared/ui";
import {
	type PublicList,
	PublicListsService
} from "../services/public-lists.service";
import { ProfileSectionHeader } from "./profile-section-header";

const COLLAPSED_LIST_COUNT = 4;

interface ListGroup {
	title: string;
	items: PublicList[];
}

@Component({
	selector: "app-profile-lists",
	imports: [
		RouterLink,
		ProfileSectionHeader,
		UiButton,
		UiProgress,
		UiSkeleton
	],
	templateUrl: "./profile-lists.html",
	host: { class: "block empty:hidden" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileLists {
	private readonly listsService = inject(PublicListsService);

	readonly username = input.required<string>();

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

	protected readonly hasHiddenLists = computed(() =>
		this.groups().some(group => group.items.length > COLLAPSED_LIST_COUNT)
	);

	protected visibleItems(group: ListGroup): PublicList[] {
		return this.expanded()
			? group.items
			: group.items.slice(0, COLLAPSED_LIST_COUNT);
	}
}
