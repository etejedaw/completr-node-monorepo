import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { avatarRing } from "../../../core/utils/premium";
import { UiAvatar, UiButton } from "../../../shared/ui";
import { type PublicProfile } from "../public-profile.model";

@Component({
	selector: "app-profile-private-state",
	imports: [RouterLink, UiAvatar, UiButton],
	templateUrl: "./profile-private-state.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePrivateState {
	readonly profile = input.required<PublicProfile>();
	readonly username = input.required<string>();
	readonly isLoggedIn = input(false);
	readonly isSelf = input(false);
	readonly togglingFollow = input(false);
	readonly canManagePremium = input(false);

	readonly followToggled = output<void>();
	readonly premiumAccessRequested = output<void>();

	protected readonly user = computed(() => this.profile().user);
	protected readonly displayName = computed(
		() => this.user().name || this.user().username || this.username()
	);
	protected readonly handle = computed(
		() => `@${this.user().username || this.username()}`
	);
	protected readonly avatarRing = computed(() =>
		avatarRing(this.user().role, this.user().hasPremium)
	);
	protected readonly isFollowEngaged = computed(
		() => this.profile().isFollowing || this.profile().hasPendingRequest
	);
	protected readonly canFollow = computed(
		() => this.isFollowEngaged() || !!this.profile().acceptFollowRequests
	);
	protected readonly followIcon = computed(() => {
		const profile = this.profile();
		if (profile.isFollowing) return "check";
		return profile.hasPendingRequest ? "schedule" : "person_add";
	});
	protected readonly followLabel = computed(() => {
		const profile = this.profile();
		if (profile.isFollowing) return "Following";
		return profile.hasPendingRequest ? "Requested" : "Request to follow";
	});
}
