import { NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";

import {
	type User,
	type VisibilityLevel
} from "../../../core/models/user.model";
import { AuthService } from "../../../core/services/auth";
import { FollowRequestsService } from "../../../core/services/follow-requests";
import { ToastService } from "../../../core/services/toast";
import { avatarRing } from "../../../core/utils/premium";
import { SegmentedControl } from "../../../shared/components/segmented-control/segmented-control";
import { UiAvatar, UiButton, UiSwitch } from "../../../shared/ui";
import { ProfileService } from "../../profile/profile";
import { SettingsPanel } from "../components/settings-panel";
import { SettingsRow } from "../components/settings-row";
import { SettingsSaveBar } from "../components/settings-save-bar";
import {
	derivePrivacyMode,
	effectiveVisibility,
	PRIVACY_PRESETS,
	PRIVACY_SECTION_GROUPS,
	type PrivacyDraft,
	type PrivacyMode,
	PROFILE_GATE,
	SECTION_KEYS,
	type SectionVisibilityKey,
	VISIBILITY_OPTIONS,
	visibilityLabel
} from "./privacy-options";

const DEFAULT_DRAFT: PrivacyDraft = {
	profileVisibility: "public",
	backlogVisibility: "public",
	shelfVisibility: "public",
	listVisibility: "public",
	queueVisibility: "public",
	wishlistVisibility: "public",
	favoriteVisibility: "public",
	feedVisibility: "public",
	platinumVisibility: "public",
	franchiseVisibility: "public",
	acceptFollowRequests: true
};

const DRAFT_KEYS = Object.keys(DEFAULT_DRAFT) as (keyof PrivacyDraft)[];

function draftFromUser(user: User): PrivacyDraft {
	return Object.fromEntries(
		DRAFT_KEYS.map(key => [key, user[key]])
	) as unknown as PrivacyDraft;
}

@Component({
	selector: "app-settings-privacy",
	imports: [
		NgTemplateOutlet,
		RouterLink,
		SegmentedControl,
		SettingsPanel,
		SettingsRow,
		SettingsSaveBar,
		UiAvatar,
		UiButton,
		UiSwitch
	],
	templateUrl: "./settings-privacy.html",
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPrivacy implements OnInit {
	private readonly authService = inject(AuthService);
	private readonly profileService = inject(ProfileService);
	private readonly followRequestsService = inject(FollowRequestsService);
	private readonly toast = inject(ToastService);

	protected readonly user = this.authService.user;
	protected readonly groups = PRIVACY_SECTION_GROUPS;
	protected readonly levelOptions = VISIBILITY_OPTIONS;
	protected readonly presets = PRIVACY_PRESETS;
	protected readonly profileGate = PROFILE_GATE;
	protected readonly visibilityLabel = visibilityLabel;
	protected readonly avatarRing = avatarRing;

	private readonly saved = signal<PrivacyDraft>(DEFAULT_DRAFT);
	protected readonly draft = signal<PrivacyDraft>(DEFAULT_DRAFT);
	protected readonly saving = signal(false);

	protected readonly hasChanges = computed(() =>
		DRAFT_KEYS.some(key => this.draft()[key] !== this.saved()[key])
	);
	protected readonly mode = signal<PrivacyMode>("public");

	protected readonly incomingRequests = this.followRequestsService.incoming;
	protected readonly requestsLoading = signal(false);
	protected readonly resolvingRequest = signal<string | null>(null);
	protected readonly showRequests = computed(
		() =>
			this.saved().profileVisibility === "private" &&
			this.saved().acceptFollowRequests
	);

	ngOnInit() {
		this.hydrate();
		this.authService.loadUser().subscribe(() => this.hydrate());
		this.loadIncomingRequests();
	}

	protected selectMode(mode: PrivacyMode) {
		this.mode.set(mode);
		if (mode === "custom") return;
		this.draft.update(draft => ({
			...draft,
			profileVisibility: mode,
			...Object.fromEntries(SECTION_KEYS.map(key => [key, mode]))
		}));
	}

	protected setProfileVisibility(level: VisibilityLevel) {
		this.draft.update(draft => ({ ...draft, profileVisibility: level }));
	}

	protected setSection(key: SectionVisibilityKey, level: VisibilityLevel) {
		this.draft.update(draft => ({ ...draft, [key]: level }));
	}

	protected levelOption(level: VisibilityLevel) {
		return VISIBILITY_OPTIONS.find(option => option.value === level)!;
	}

	protected setAcceptFollowRequests(accept: boolean) {
		this.draft.update(draft => ({
			...draft,
			acceptFollowRequests: accept
		}));
	}

	protected effectiveLevel(key: SectionVisibilityKey): VisibilityLevel {
		return effectiveVisibility(
			this.draft()[key],
			this.draft().profileVisibility
		);
	}

	protected discard() {
		this.draft.set(this.saved());
		this.mode.set(derivePrivacyMode(this.saved()));
	}

	protected save() {
		const draft = this.draft();
		this.saving.set(true);
		this.profileService.update(draft).subscribe({
			next: () => {
				this.saving.set(false);
				this.saved.set(draft);
				this.toast.success("Privacy settings updated.");
				this.authService.loadUser().subscribe();
				this.loadIncomingRequests();
			},
			error: () => {
				this.saving.set(false);
				this.toast.warning("Could not update privacy settings.");
			}
		});
	}

	protected acceptRequest(requesterId: string) {
		if (this.resolvingRequest()) return;
		this.resolvingRequest.set(requesterId);
		this.followRequestsService.accept(requesterId).subscribe({
			next: () => {
				this.resolvingRequest.set(null);
				this.toast.success("Follow request accepted.");
			},
			error: () => {
				this.resolvingRequest.set(null);
				this.toast.warning("Could not accept the request.");
			}
		});
	}

	protected rejectRequest(requesterId: string) {
		if (this.resolvingRequest()) return;
		this.resolvingRequest.set(requesterId);
		this.followRequestsService.reject(requesterId).subscribe({
			next: () => this.resolvingRequest.set(null),
			error: () => {
				this.resolvingRequest.set(null);
				this.toast.warning("Could not reject the request.");
			}
		});
	}

	private loadIncomingRequests() {
		this.requestsLoading.set(true);
		this.followRequestsService.list().subscribe({
			next: () => this.requestsLoading.set(false),
			error: () => this.requestsLoading.set(false)
		});
	}

	private hydrate() {
		const user = this.user();
		if (!user || this.hasChanges()) return;
		const snapshot = draftFromUser(user);
		this.saved.set(snapshot);
		this.draft.set(snapshot);
		this.mode.set(derivePrivacyMode(snapshot));
	}
}
