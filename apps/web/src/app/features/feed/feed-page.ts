import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { AuthService } from "../../core/services/auth";
import { FollowRequestsService } from "../../core/services/follow-requests";
import { ToastService } from "../../core/services/toast";
import { isPremiumRole } from "../../core/utils/premium";
import { PremiumOnly } from "../../shared/directives/premium-only";
import {
	UiAvatar,
	UiButton,
	UiPagination,
	UiPremiumBadge,
	UiSkeleton
} from "../../shared/ui";
import { type FeedActivity, type FeedCategory, FeedService } from "./feed";
import { FeedActivityItem } from "./feed-activity-item/feed-activity-item";

interface ActivityEntry {
	key: string;
	activities: FeedActivity[];
}

interface ActivityDayGroup {
	key: string;
	label: string;
	entries: ActivityEntry[];
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

function gameCodeOf(activity: FeedActivity): string | null {
	const game =
		activity.target?.type === "game" ? activity.target : activity.game;
	return game?.code ?? null;
}

function belongsToEntry(entry: ActivityEntry, activity: FeedActivity): boolean {
	const latest = entry.activities[entry.activities.length - 1];
	const gameCode = gameCodeOf(activity);
	return (
		gameCode !== null &&
		gameCode === gameCodeOf(latest) &&
		activity.user?.id === latest.user?.id &&
		activity.type !== "coop_tagged" &&
		latest.type !== "coop_tagged"
	);
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
				entries: []
			};
			groups.set(dayStart, group);
		}
		const lastEntry = group.entries[group.entries.length - 1];
		if (lastEntry && belongsToEntry(lastEntry, activity)) {
			lastEntry.activities.push(activity);
		} else {
			group.entries.push({ key: activity.id, activities: [activity] });
		}
	}
	return [...groups.values()];
}

@Component({
	selector: "app-feed-page",
	imports: [
		RouterLink,
		UiAvatar,
		UiButton,
		UiPagination,
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

	protected readonly filter = signal("");
	protected readonly filterOptions = [
		{ value: "", label: "All activity" },
		{ value: "cat:games", label: "Games" },
		{ value: "type:backlog_completed", label: "Completed only" },
		{ value: "type:backlog_abandoned", label: "Abandoned only" },
		{ value: "type:backlog_playing", label: "Started playing" },
		{ value: "type:game_reviewed", label: "Reviews" },
		{ value: "cat:lists", label: "Lists" },
		{ value: "cat:social", label: "Co-op & social" }
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

	deleteActivities(ids: string[]) {
		const snapshot = this.activities();
		const removed = new Set(ids);
		if (!snapshot.some(activity => removed.has(activity.id))) return;
		this.activities.set(
			snapshot.filter(activity => !removed.has(activity.id))
		);
		this.toast.pending({
			message: ids.length > 1 ? "Activities removed" : "Activity removed",
			onCommit: () =>
				ids.forEach(id =>
					this.feedService.deleteActivity(id).subscribe()
				),
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
