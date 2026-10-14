import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { isPremiumRole } from "../../../core/utils/premium";
import { ActivityDeleteButton } from "../../../shared/components/activity-delete-button/activity-delete-button";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import { UiAvatar } from "../../../shared/ui";
import {
	activityIcon,
	activityIconColorClass,
	activityLabel
} from "../../../shared/utils/activity-labels";
import { type ActivityTarget, type FeedActivity } from "../feed";

interface ActivityActor {
	username: string;
	displayName: string;
	avatarUrl: string | null | undefined;
	isPremium: boolean;
}

const TIME_OF_DAY_FORMAT = new Intl.DateTimeFormat("en", {
	hour: "numeric",
	minute: "2-digit"
});

@Component({
	selector: "app-feed-activity-item",
	imports: [RouterLink, ActivityDeleteButton, GamePoster, UiAvatar],
	templateUrl: "./feed-activity-item.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeedActivityItem {
	readonly activity = input.required<FeedActivity>();
	readonly isOwn = input(false);

	readonly deleted = output<string>();

	protected readonly actor = computed<ActivityActor | null>(() => {
		const activity = this.activity();
		const target = activity.target;
		if (activity.type === "user_followed_by" && target?.type === "user") {
			return {
				username: target.username ?? "",
				displayName: target.name,
				avatarUrl: target.avatarUrl,
				isPremium: isPremiumRole(target.role)
			};
		}
		if (!activity.user) return null;
		return {
			username: activity.user.username,
			displayName: activity.user.name || activity.user.username,
			avatarUrl: activity.user.avatarUrl,
			isPremium: isPremiumRole(activity.user.role)
		};
	});

	protected readonly game = computed<ActivityTarget | null>(() => {
		const activity = this.activity();
		return activity.target?.type === "game"
			? activity.target
			: activity.game;
	});

	protected readonly secondaryTarget = computed<ActivityTarget | null>(() => {
		const activity = this.activity();
		const target = activity.target;
		if (!target || target.type === "game") return null;
		if (activity.type === "user_followed_by") return null;
		return target;
	});

	protected readonly actionLabel = computed(() =>
		this.isCoop() ? "is playing co-op" : this.label()
	);
	protected readonly isCoop = computed(
		() => this.activity().type === "coop_tagged"
	);
	protected readonly label = computed(() =>
		activityLabel(this.activity().type)
	);
	protected readonly icon = computed(() =>
		activityIcon(this.activity().type)
	);
	protected readonly iconColor = computed(() =>
		activityIconColorClass(this.activity().type)
	);
	protected readonly time = computed(() =>
		TIME_OF_DAY_FORMAT.format(new Date(this.activity().createdAt))
	);

	protected emitDelete(): void {
		this.deleted.emit(this.activity().id);
	}
}
