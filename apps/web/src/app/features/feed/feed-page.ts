import { type HttpErrorResponse } from "@angular/common/http";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	linkedSignal,
	signal
} from "@angular/core";
import { rxResource, takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";

import { AuthService } from "../../core/services/auth";
import { FollowRequestsService } from "../../core/services/follow-requests";
import { ToastService } from "../../core/services/toast";
import { avatarRing } from "../../core/utils/premium";
import { LibraryHero } from "../../shared/components/library-hero/library-hero";
import { type LibraryHeroPoster } from "../../shared/components/library-hero/library-hero.model";
import { LibraryToolbar } from "../../shared/components/library-toolbar/library-toolbar";
import { OptionPicker } from "../../shared/components/option-picker/option-picker";
import { type PickerOption } from "../../shared/components/option-picker/option-picker.model";
import { PremiumOnly } from "../../shared/directives/premium-only";
import {
	UiAvatar,
	UiButton,
	UiEyebrow,
	UiPagination,
	UiPlainEmptyState,
	UiPremiumBadge,
	UiSkeleton
} from "../../shared/ui";
import { injectFollowRequestActions } from "../../shared/utils/inject-follow-request-actions";
import { FeedService } from "./feed";
import { type FeedActivity, type FeedCategory } from "./feed.model";
import { FeedActivityItem } from "./feed-activity-item/feed-activity-item";
import { gamePosters } from "./feed-hero-posters";
import { type ActivityDayGroup } from "./feed-page.model";

const DAY_MS = 86_400_000;
const ACTIVITY_NOT_FOUND_STATUS = 404;
const FEED_PAGE_SIZE = 25;
const WEEKDAY_FORMAT = new Intl.DateTimeFormat("en", { weekday: "long" });
const DATE_FORMAT = new Intl.DateTimeFormat("en", {
	month: "short",
	day: "numeric",
	year: "numeric"
});

function startOfDay(date: Date): number {
	return new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate()
	).getTime();
}

function dayLabel(dayStart: number, todayStart: number): string {
	const daysAgo = Math.round((todayStart - dayStart) / DAY_MS);
	if (daysAgo === 0) return "Today";
	if (daysAgo === 1) return "Yesterday";
	if (daysAgo < 7) return WEEKDAY_FORMAT.format(dayStart);
	return DATE_FORMAT.format(dayStart);
}

function groupByDay(activities: FeedActivity[]): ActivityDayGroup[] {
	const todayStart = startOfDay(new Date());
	const groups = new Map<number, ActivityDayGroup>();
	for (const activity of activities) {
		const dayStart = startOfDay(new Date(activity.createdAt));
		let group = groups.get(dayStart);
		if (!group) {
			group = {
				key: String(dayStart),
				label: dayLabel(dayStart, todayStart),
				activities: []
			};
			groups.set(dayStart, group);
		}
		group.activities.push(activity);
	}
	return [...groups.values()];
}

function buildFilterParams(value: string): {
	category?: FeedCategory;
	types?: string;
} {
	if (value.startsWith("cat:"))
		return { category: value.slice(4) as FeedCategory };
	if (value.startsWith("type:")) return { types: value.slice(5) };
	return {};
}

@Component({
	selector: "app-feed-page",
	imports: [
		RouterLink,
		LibraryHero,
		LibraryToolbar,
		OptionPicker,
		UiAvatar,
		UiButton,
		UiEyebrow,
		UiPagination,
		UiPlainEmptyState,
		UiPremiumBadge,
		UiSkeleton,
		PremiumOnly,
		FeedActivityItem
	],
	templateUrl: "./feed-page.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeedPage {
	private readonly feedService = inject(FeedService);
	private readonly authService = inject(AuthService);
	private readonly toast = inject(ToastService);
	private readonly followRequestsService = inject(FollowRequestsService);
	private readonly followRequestActions = injectFollowRequestActions();

	protected readonly avatarRing = avatarRing;
	protected readonly currentUser = this.authService.user;
	protected readonly offset = signal(0);
	protected readonly limit = FEED_PAGE_SIZE;
	protected readonly skeletonRows = [0, 1, 2, 3];
	protected readonly filter = signal("");
	private readonly removedIds = signal<ReadonlySet<string>>(new Set());

	private readonly feed = rxResource({
		params: () => ({ offset: this.offset(), filter: this.filter() }),
		stream: ({ params }) =>
			this.feedService.getFeed({
				limit: FEED_PAGE_SIZE,
				offset: params.offset,
				...buildFilterParams(params.filter)
			})
	});

	protected readonly isLoading = this.feed.isLoading;
	protected readonly loadFailed = computed(
		() => this.feed.status() === "error"
	);
	protected readonly activities = computed<FeedActivity[]>(() => {
		if (!this.feed.hasValue()) return [];
		const removed = this.removedIds();
		return this.feed
			.value()
			.data.activities.filter(activity => !removed.has(activity.id));
	});
	protected readonly total = computed(() =>
		this.feed.hasValue() ? this.feed.value().data.total : 0
	);
	protected readonly activityGroups = computed(() =>
		groupByDay(this.activities())
	);
	private readonly loadedHeroPosters = computed(() =>
		gamePosters(this.activities())
	);
	protected readonly heroPosters = linkedSignal<
		{ posters: LibraryHeroPoster[]; isLoading: boolean },
		LibraryHeroPoster[]
	>({
		source: () => ({
			posters: this.loadedHeroPosters(),
			isLoading: this.isLoading()
		}),
		computation: ({ posters, isLoading }, previous) =>
			isLoading && previous?.value.length ? previous.value : posters
	});

	protected readonly filterOptions: readonly PickerOption[] = [
		{ value: "", label: "All activity", icon: "dynamic_feed" },
		{ value: "cat:games", label: "Games", icon: "sports_esports" },
		{
			value: "type:backlog_completed",
			label: "Completed only",
			icon: "check_circle",
			iconClass: "text-success"
		},
		{
			value: "type:backlog_abandoned",
			label: "Abandoned only",
			icon: "cancel",
			iconClass: "text-danger"
		},
		{
			value: "type:backlog_playing",
			label: "Started playing",
			icon: "play_circle",
			iconClass: "text-playing"
		},
		{ value: "type:game_reviewed", label: "Reviews", icon: "rate_review" },
		{
			value: "type:game_platinumed",
			label: "Platinums",
			icon: "emoji_events"
		},
		{ value: "cat:lists", label: "Lists", icon: "format_list_bulleted" },
		{ value: "cat:social", label: "Co-op & social", icon: "group" }
	];

	protected readonly followRequests = this.followRequestsService.incoming;
	protected readonly resolvingRequest = this.followRequestActions.resolvingId;

	constructor() {
		this.followRequestsService
			.list()
			.pipe(takeUntilDestroyed())
			.subscribe({ error: () => undefined });
	}

	protected onOffsetChange(offset: number) {
		this.offset.set(offset);
	}

	protected setFilter(value: string) {
		if (value === this.filter()) return;
		this.filter.set(value);
		this.offset.set(0);
	}

	protected retry() {
		this.feed.reload();
	}

	protected deleteActivity(id: string) {
		if (this.removedIds().has(id)) return;
		this.markRemoved(id);
		this.toast.pending({
			message: "Activity removed",
			onCommit: () => this.commitDelete(id),
			onUndo: () => this.restore(id)
		});
	}

	protected isOwnActivity(activity: FeedActivity): boolean {
		return activity.user?.id === this.currentUser()?.id;
	}

	protected acceptFollowRequest(requesterId: string) {
		this.followRequestActions.accept(requesterId);
	}

	protected rejectFollowRequest(requesterId: string) {
		this.followRequestActions.reject(requesterId);
	}

	private commitDelete(id: string) {
		this.feedService.deleteActivity(id).subscribe({
			error: (error: HttpErrorResponse) => {
				if (error.status === ACTIVITY_NOT_FOUND_STATUS) return;
				this.restore(id);
				this.toast.warning("Could not remove that activity.");
			}
		});
	}

	private markRemoved(id: string) {
		this.removedIds.update(ids => new Set(ids).add(id));
	}

	private restore(id: string) {
		this.removedIds.update(ids => {
			const next = new Set(ids);
			next.delete(id);
			return next;
		});
	}
}
