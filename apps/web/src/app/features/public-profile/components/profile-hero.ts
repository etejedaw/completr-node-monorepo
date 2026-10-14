import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { isPremiumRole } from "../../../core/utils/premium";
import { elevatedRoleBadge } from "../../../core/utils/role-badge";
import { CoverUrlPipe } from "../../../shared/pipes/cover-url";
import { UiAvatar, UiButton } from "../../../shared/ui";
import { type PublicProfile } from "../public-profile.service";

const MEMBER_SINCE_FORMAT = new Intl.DateTimeFormat("en", {
	month: "long",
	year: "numeric"
});

@Component({
	selector: "app-profile-hero",
	imports: [RouterLink, CoverUrlPipe, UiAvatar, UiButton],
	templateUrl: "./profile-hero.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileHero {
	readonly profile = input.required<PublicProfile>();
	readonly backdropUrl = input<string | null>(null);
	readonly isSelf = input(false);
	readonly isLoggedIn = input(false);
	readonly togglingFollow = input(false);

	readonly followToggled = output<void>();
	readonly shared = output<void>();

	protected readonly backdropLoaded = signal<string | null>(null);
	protected readonly isBackdropLoaded = computed(
		() => this.backdropLoaded() === this.backdropUrl()
	);

	protected readonly user = computed(() => this.profile().user);
	protected readonly displayName = computed(
		() => this.user().name || this.user().username
	);
	protected readonly isPremium = computed(() =>
		isPremiumRole(this.user().role)
	);
	protected readonly roleBadge = computed(() =>
		elevatedRoleBadge(this.user().role)
	);
	protected readonly memberSince = computed(() =>
		MEMBER_SINCE_FORMAT.format(new Date(this.user().createdAt))
	);
	protected readonly isFollowEngaged = computed(
		() => this.profile().isFollowing || this.profile().hasPendingRequest
	);
	protected readonly followLabel = computed(() => {
		const profile = this.profile();
		if (profile.isFollowing) return "Following";
		if (profile.hasPendingRequest) return "Requested";
		return "Follow";
	});
	protected readonly followIcon = computed(() => {
		const profile = this.profile();
		if (profile.isFollowing) return "check";
		if (profile.hasPendingRequest) return "schedule";
		return "person_add";
	});
}
