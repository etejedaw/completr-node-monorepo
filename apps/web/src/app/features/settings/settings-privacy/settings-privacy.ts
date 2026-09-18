import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type VisibilityLevel } from "../../../core/models/user.model";
import { AuthService } from "../../../core/services/auth";
import { FollowRequestsService } from "../../../core/services/follow-requests";
import { ToastService } from "../../../core/services/toast";
import { UiAvatar, UiButton } from "../../../shared/ui";
import { ProfileService, type UpdateProfileDto } from "../../profile/profile";

type PrivacyPreset = "custom" | "private" | "friends" | "open";

interface SectionConfig {
	key:
		| "backlogVisibility"
		| "shelfVisibility"
		| "listVisibility"
		| "queueVisibility"
		| "wishlistVisibility"
		| "favoriteVisibility"
		| "feedVisibility";
	group: "Library" | "Curation" | "Social";
	title: string;
	description: string;
}

const SECTIONS: SectionConfig[] = [
	{
		key: "backlogVisibility",
		group: "Library",
		title: "My Games",
		description: "Show your full game history."
	},
	{
		key: "shelfVisibility",
		group: "Library",
		title: "My Shelf",
		description: "Show the games you own."
	},
	{
		key: "listVisibility",
		group: "Curation",
		title: "Lists",
		description: "Show your lists section."
	},
	{
		key: "queueVisibility",
		group: "Curation",
		title: "Up Next",
		description: "Show your priority queue."
	},
	{
		key: "wishlistVisibility",
		group: "Curation",
		title: "Wanted",
		description: "Show the games you'd like to acquire."
	},
	{
		key: "favoriteVisibility",
		group: "Curation",
		title: "Favorites",
		description: "Show your favorites."
	},
	{
		key: "feedVisibility",
		group: "Social",
		title: "Activity feed",
		description: "Show your activity in followers' feeds."
	}
];

@Component({
	selector: "app-settings-privacy",
	imports: [UiAvatar, UiButton, RouterLink],
	templateUrl: "./settings-privacy.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPrivacy implements OnInit {
	private readonly authService = inject(AuthService);
	private readonly profileService = inject(ProfileService);
	private readonly toast = inject(ToastService);
	private readonly followRequestsService = inject(FollowRequestsService);

	protected readonly user = this.authService.user;

	protected readonly profileVisibility = signal<VisibilityLevel>("public");
	protected readonly backlogVisibility = signal<VisibilityLevel>("public");
	protected readonly shelfVisibility = signal<VisibilityLevel>("public");
	protected readonly listVisibility = signal<VisibilityLevel>("public");
	protected readonly queueVisibility = signal<VisibilityLevel>("public");
	protected readonly wishlistVisibility = signal<VisibilityLevel>("public");
	protected readonly favoriteVisibility = signal<VisibilityLevel>("public");
	protected readonly feedVisibility = signal<VisibilityLevel>("public");
	protected readonly acceptFollowRequests = signal(true);

	protected readonly saving = signal(false);
	protected readonly mode = signal<PrivacyPreset>("open");

	protected readonly incomingRequests = this.followRequestsService.incoming;
	protected readonly incomingLoading = signal(false);
	protected readonly resolvingRequest = signal<string | null>(null);
	protected readonly showRequestsSection = computed(
		() =>
			this.profileVisibility() === "private" &&
			this.acceptFollowRequests()
	);

	protected readonly sections = SECTIONS;
	protected readonly libraryGroup = SECTIONS.filter(
		s => s.group === "Library"
	);
	protected readonly curationGroup = SECTIONS.filter(
		s => s.group === "Curation"
	);
	protected readonly socialGroup = SECTIONS.filter(s => s.group === "Social");

	protected readonly showCustomPanel = computed(
		() => this.mode() === "custom"
	);

	ngOnInit() {
		this.authService.loadUser().subscribe(() => this.hydrate());
		this.hydrate();
		this.loadIncomingRequests();
	}

	private hydrate() {
		const u = this.user();
		if (!u) return;
		this.profileVisibility.set(u.profileVisibility);
		this.backlogVisibility.set(u.backlogVisibility);
		this.shelfVisibility.set(u.shelfVisibility);
		this.listVisibility.set(u.listVisibility);
		this.queueVisibility.set(u.queueVisibility);
		this.wishlistVisibility.set(u.wishlistVisibility);
		this.favoriteVisibility.set(u.favoriteVisibility);
		this.feedVisibility.set(u.feedVisibility);
		this.acceptFollowRequests.set(u.acceptFollowRequests);
		this.mode.set(this.derivePreset());
	}

	private loadIncomingRequests() {
		this.incomingLoading.set(true);
		this.followRequestsService.list().subscribe({
			next: () => this.incomingLoading.set(false),
			error: () => this.incomingLoading.set(false)
		});
	}

	acceptRequest(requesterId: string) {
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

	rejectRequest(requesterId: string) {
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

	toggleAcceptFollowRequests(value: boolean) {
		this.acceptFollowRequests.set(value);
	}

	private derivePreset(): PrivacyPreset {
		const levels = [
			this.profileVisibility(),
			this.backlogVisibility(),
			this.shelfVisibility(),
			this.listVisibility(),
			this.queueVisibility(),
			this.wishlistVisibility(),
			this.favoriteVisibility(),
			this.feedVisibility()
		];
		if (levels.every(l => l === "public")) return "open";
		if (levels.every(l => l === "private")) return "private";
		if (levels.every(l => l === "friends")) return "friends";
		return "custom";
	}

	selectPreset(preset: PrivacyPreset) {
		this.mode.set(preset);
		if (preset === "custom") return;
		const level: VisibilityLevel = preset === "open" ? "public" : preset;
		this.setAll(level);
	}

	getSection(key: SectionConfig["key"]): VisibilityLevel {
		switch (key) {
			case "backlogVisibility":
				return this.backlogVisibility();
			case "shelfVisibility":
				return this.shelfVisibility();
			case "listVisibility":
				return this.listVisibility();
			case "queueVisibility":
				return this.queueVisibility();
			case "wishlistVisibility":
				return this.wishlistVisibility();
			case "favoriteVisibility":
				return this.favoriteVisibility();
			case "feedVisibility":
				return this.feedVisibility();
		}
	}

	setSection(key: SectionConfig["key"], level: VisibilityLevel) {
		switch (key) {
			case "backlogVisibility":
				this.backlogVisibility.set(level);
				break;
			case "shelfVisibility":
				this.shelfVisibility.set(level);
				break;
			case "listVisibility":
				this.listVisibility.set(level);
				break;
			case "queueVisibility":
				this.queueVisibility.set(level);
				break;
			case "wishlistVisibility":
				this.wishlistVisibility.set(level);
				break;
			case "favoriteVisibility":
				this.favoriteVisibility.set(level);
				break;
			case "feedVisibility":
				this.feedVisibility.set(level);
				break;
		}
		this.mode.set(this.derivePreset());
	}

	setProfileVisibility(level: VisibilityLevel) {
		this.profileVisibility.set(level);
		this.mode.set(this.derivePreset());
	}

	private setAll(level: VisibilityLevel) {
		this.profileVisibility.set(level);
		this.backlogVisibility.set(level);
		this.shelfVisibility.set(level);
		this.listVisibility.set(level);
		this.queueVisibility.set(level);
		this.wishlistVisibility.set(level);
		this.favoriteVisibility.set(level);
		this.feedVisibility.set(level);
	}

	save() {
		this.saving.set(true);
		const dto: UpdateProfileDto = {
			profileVisibility: this.profileVisibility(),
			backlogVisibility: this.backlogVisibility(),
			shelfVisibility: this.shelfVisibility(),
			listVisibility: this.listVisibility(),
			queueVisibility: this.queueVisibility(),
			wishlistVisibility: this.wishlistVisibility(),
			favoriteVisibility: this.favoriteVisibility(),
			feedVisibility: this.feedVisibility(),
			acceptFollowRequests: this.acceptFollowRequests()
		};
		this.profileService.update(dto).subscribe({
			next: () => {
				this.saving.set(false);
				this.toast.success("Privacy settings updated.");
				this.authService.loadUser().subscribe();
				this.loadIncomingRequests();
			},
			error: () => {
				this.saving.set(false);
				this.toast.warning("Could not update settings.");
			}
		});
	}
}
