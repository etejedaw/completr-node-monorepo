import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { avatarRing } from "../../../core/utils/premium";
import { elevatedRoleBadge } from "../../../core/utils/role-badge";
import { ProfileBackdrop } from "../../../shared/components/profile-backdrop/profile-backdrop";
import { UiAvatar, UiButton } from "../../../shared/ui";
import { type PublicProfile } from "../public-profile.service";

const MEMBER_SINCE_FORMAT = new Intl.DateTimeFormat("en", {
	month: "long",
	year: "numeric"
});

@Component({
	selector: "app-profile-hero",
	imports: [RouterLink, ProfileBackdrop, UiAvatar, UiButton],
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

	protected readonly user = computed(() => this.profile().user);
	protected readonly displayName = computed(
		() => this.user().name || this.user().username
	);
	protected readonly avatarRing = computed(() =>
		avatarRing(this.user().role)
	);
	protected readonly avatarHaloClass = computed(() => {
		const ring = this.avatarRing();
		if (ring === "admin") return "from-admin via-admin/40";
		if (ring === "premium") return "from-premium via-premium/40";
		return "from-brand via-brand/40";
	});
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
