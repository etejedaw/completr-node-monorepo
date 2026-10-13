import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { isPremiumRole } from "../../../core/utils/premium";
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

interface ActivityAction {
	type: string;
	label: string;
	icon: string;
	iconColor: string;
}

const TIME_OF_DAY_FORMAT = new Intl.DateTimeFormat("en", {
	hour: "numeric",
	minute: "2-digit"
});

function toAction(type: string): ActivityAction {
	return {
		type,
		label: activityLabel(type),
		icon: activityIcon(type),
		iconColor: activityIconColorClass(type)
	};
}

@Component({
	selector: "app-feed-activity-item",
	imports: [RouterLink, GamePoster, UiAvatar],
	templateUrl: "./feed-activity-item.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeedActivityItem {
	readonly activities = input.required<FeedActivity[]>();
	readonly isOwn = input(false);

	readonly deleted = output<string[]>();

	protected readonly activity = computed(() => this.activities()[0]);
	protected readonly actions = computed(() => {
		const types = this.activities()
			.map(activity => activity.type)
			.reverse();
		return [...new Set(types)].map(toAction);
	});

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

	protected readonly actionsLabel = computed(() =>
		this.isCoop()
			? "is playing co-op"
			: this.actions()
					.map(action => action.label)
					.join(" · ")
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
		this.deleted.emit(this.activities().map(activity => activity.id));
	}
}
