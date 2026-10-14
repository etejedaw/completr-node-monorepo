import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	linkedSignal,
	type OnInit,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { AuthService } from "../../core/services/auth";
import { FollowRequestsService } from "../../core/services/follow-requests";
import { ToastService } from "../../core/services/toast";
import { isPremiumRole } from "../../core/utils/premium";
import {
	LibraryHero,
	type LibraryHeroPoster
} from "../../shared/components/library-hero/library-hero";
import {
	OptionPicker,
	type PickerOption
} from "../../shared/components/option-picker/option-picker";
import { PremiumOnly } from "../../shared/directives/premium-only";
import {
	UiAvatar,
	UiButton,
	UiPagination,
	UiPlainEmptyState,
	UiPremiumBadge,
	UiSkeleton
} from "../../shared/ui";
import {
	type ActivityTarget,
	type FeedActivity,
	type FeedCategory,
	FeedService
} from "./feed";
import { FeedActivityItem } from "./feed-activity-item/feed-activity-item";

interface ActivityDayGroup {
	key: string;
	label: string;
	activities: FeedActivity[];
}

const DAY_MS = 86_400_000;
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

function gamePosters(activities: FeedActivity[]): LibraryHeroPoster[] {
	const seenGameKeys = new Set<string>();
	const posters: LibraryHeroPoster[] = [];
	for (const { game } of activities) {
		if (!game?.backgroundUrl) continue;
		const gameKey = gameIdentity(game);
		if (seenGameKeys.has(gameKey)) continue;
		seenGameKeys.add(gameKey);
		posters.push({ src: game.backgroundUrl, title: game.name });
	}
	return posters;
}

function gameIdentity(game: ActivityTarget): string {
	return game.id || game.code || game.name;
}

@Component({
	selector: "app-feed-page",
	imports: [
		RouterLink,
		LibraryHero,
		OptionPicker,
		UiAvatar,
		UiButton,
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
export class FeedPage implements OnInit {
	private readonly feedService = inject(FeedService);
	private readonly authService = inject(AuthService);
	private readonly toast = inject(ToastService);
	private readonly followRequestsService = inject(FollowRequestsService);

	protected readonly isPremiumRole = isPremiumRole;
	protected readonly currentUserId = this.authService.user;
	protected readonly activities = signal<FeedActivity[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 25;
	protected readonly skeletonRows = [0, 1, 2, 3];
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

	protected readonly filter = signal("");
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
		{ value: "cat:lists", label: "Lists", icon: "format_list_bulleted" },
		{ value: "cat:social", label: "Co-op & social", icon: "group" }
	];

	protected readonly followRequests = this.followRequestsService.incoming;
	protected readonly resolvingRequest = signal<string | null>(null);

	onOffsetChange(offset: number) {
		this.offset.set(offset);
		this.loadFeed();
	}

	setFilter(value: string) {
		if (value === this.filter()) return;
		this.filter.set(value);
		this.offset.set(0);
		this.loadFeed();
	}

	private buildFilterParams(): { category?: FeedCategory; types?: string } {
		const value = this.filter();
		if (value.startsWith("cat:"))
			return { category: value.slice(4) as FeedCategory };
		if (value.startsWith("type:")) return { types: value.slice(5) };
		return {};
	}

	ngOnInit() {
		this.loadFeed();
		this.followRequestsService.list().subscribe();
	}

	deleteActivity(id: string) {
		const snapshot = this.activities();
		if (!snapshot.some(activity => activity.id === id)) return;
		this.activities.set(snapshot.filter(activity => activity.id !== id));
		this.toast.pending({
			message: "Activity removed",
			onCommit: () => this.feedService.deleteActivity(id).subscribe(),
			onUndo: () => this.activities.set(snapshot)
		});
	}

	isOwnActivity(activity: FeedActivity): boolean {
		return activity.user?.id === this.currentUserId()?.id;
	}

	acceptFollowRequest(requesterId: string) {
		if (this.resolvingRequest()) return;
		this.resolvingRequest.set(requesterId);
		this.followRequestsService.accept(requesterId).subscribe({
			next: () => {
				this.resolvingRequest.set(null);
				this.toast.success("Follow request accepted.");
			},
			error: () => {
				this.resolvingRequest.set(null);
				this.toast.warning("Could not accept request.");
			}
		});
	}

	rejectFollowRequest(requesterId: string) {
		if (this.resolvingRequest()) return;
		this.resolvingRequest.set(requesterId);
		this.followRequestsService.reject(requesterId).subscribe({
			next: () => this.resolvingRequest.set(null),
			error: () => {
				this.resolvingRequest.set(null);
				this.toast.warning("Could not reject request.");
			}
		});
	}

	private loadFeed() {
		this.isLoading.set(true);
		this.feedService
			.getFeed({
				limit: this.limit,
				offset: this.offset(),
				...this.buildFilterParams()
			})
			.subscribe({
				next: res => {
					this.activities.set(res.data.activities);
					this.total.set(res.data.total);
					this.isLoading.set(false);
				},
				error: () => this.isLoading.set(false)
			});
	}
}
