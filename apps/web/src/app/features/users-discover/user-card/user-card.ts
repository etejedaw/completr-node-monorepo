import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type UserResult } from "../../../core/services/users";
import { isPremiumRole } from "../../../core/utils/premium";
import { CoverUrlPipe } from "../../../shared/pipes/cover-url";
import { UiAvatar, UiButton } from "../../../shared/ui";

export type FollowState = "none" | "following" | "requested";

@Component({
	selector: "app-user-card",
	imports: [RouterLink, CoverUrlPipe, UiAvatar, UiButton],
	templateUrl: "./user-card.html",
	host: { class: "block h-full" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserCard {
	readonly user = input.required<UserResult>();
	readonly followState = input<FollowState>("none");
	readonly canFollow = input(false);
	readonly busy = input(false);

	readonly followToggled = output<void>();

	protected readonly isPremium = computed(() =>
		isPremiumRole(this.user().role)
	);
	protected readonly displayName = computed(
		() => this.user().name || this.user().username
	);
	protected readonly hasStats = computed(
		() =>
			this.user().gamesTotal !== null &&
			this.user().gamesTotal !== undefined
	);
	protected readonly followLabel = computed(() => {
		const state = this.followState();
		if (state === "following") return "Following";
		if (state === "requested") return "Requested";
		return "Follow";
	});
	protected readonly followIcon = computed(() => {
		const state = this.followState();
		if (state === "following") return "check";
		if (state === "requested") return "schedule";
		return "person_add";
	});
}
