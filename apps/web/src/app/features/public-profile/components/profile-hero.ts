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
import { CoverUrlPipe } from "../../../shared/pipes/cover-url";
import { UiAvatar } from "../../../shared/ui";
import { type PublicProfile } from "../public-profile.service";

const ROLE_BADGES: Record<string, { label: string; className: string }> = {
	admin: { label: "Admin", className: "bg-danger/20 text-danger" },
	moderator: { label: "Mod", className: "bg-info/20 text-info" },
	premium: { label: "Premium", className: "bg-premium/20 text-premium" }
};

const MEMBER_SINCE_FORMAT = new Intl.DateTimeFormat("en", {
	month: "long",
	year: "numeric"
});

@Component({
	selector: "app-profile-hero",
	imports: [RouterLink, CoverUrlPipe, UiAvatar],
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
	protected readonly roleBadge = computed(
		() => ROLE_BADGES[this.user().role] ?? null
	);
	protected readonly memberSince = computed(() =>
		MEMBER_SINCE_FORMAT.format(new Date(this.user().createdAt))
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
