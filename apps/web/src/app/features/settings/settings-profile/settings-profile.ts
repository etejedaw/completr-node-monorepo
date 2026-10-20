import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { form, FormField, maxLength } from "@angular/forms/signals";

import { AuthService } from "../../../core/services/auth";
import { ToastService } from "../../../core/services/toast";
import { avatarRing } from "../../../core/utils/premium";
import { ProfileBackdrop } from "../../../shared/components/profile-backdrop/profile-backdrop";
import { UiAvatar, UiInput, UiTextarea } from "../../../shared/ui";
import { ProfileService, type UpdateProfileDto } from "../../profile/profile";
import { injectProfileBackdrop } from "../../public-profile/profile-backdrop";
import { SettingsPanel } from "../components/settings-panel";
import { SettingsRow } from "../components/settings-row";
import { SettingsSaveBar } from "../components/settings-save-bar";

const NAME_MAX_LENGTH = 80;
const BIO_MAX_LENGTH = 250;
const AVATAR_COUNT = 15;

interface ProfileDraft {
	name: string;
	bio: string;
	avatarUrl: string;
}

const EMPTY_DRAFT: ProfileDraft = { name: "", bio: "", avatarUrl: "" };

@Component({
	selector: "app-settings-profile",
	imports: [
		FormField,
		ProfileBackdrop,
		SettingsPanel,
		SettingsRow,
		SettingsSaveBar,
		UiAvatar,
		UiInput,
		UiTextarea
	],
	templateUrl: "./settings-profile.html",
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsProfile implements OnInit {
	private readonly authService = inject(AuthService);
	private readonly profileService = inject(ProfileService);
	private readonly toast = inject(ToastService);

	protected readonly user = this.authService.user;
	protected readonly avatarRing = computed(() =>
		avatarRing(this.authService.user()?.role)
	);
	protected readonly backdropUrl = injectProfileBackdrop(
		() => this.user()?.username
	);
	protected readonly nameMaxLength = NAME_MAX_LENGTH;
	protected readonly bioMaxLength = BIO_MAX_LENGTH;
	protected readonly avatars = Array.from(
		{ length: AVATAR_COUNT },
		(_, i) =>
			`/avatars/completr_profile_${String(i + 1).padStart(2, "0")}.png`
	);

	private readonly saved = signal<ProfileDraft>(EMPTY_DRAFT);
	protected readonly draft = signal<ProfileDraft>(EMPTY_DRAFT);
	protected readonly profileForm = form(this.draft, path => {
		maxLength(path.name, NAME_MAX_LENGTH, {
			message: `Keep it under ${NAME_MAX_LENGTH} characters.`
		});
		maxLength(path.bio, BIO_MAX_LENGTH, {
			message: `Keep it under ${BIO_MAX_LENGTH} characters.`
		});
	});
	protected readonly saving = signal(false);

	protected readonly hasChanges = computed(() => {
		const draft = this.draft();
		const saved = this.saved();
		return (
			draft.name !== saved.name ||
			draft.bio !== saved.bio ||
			draft.avatarUrl !== saved.avatarUrl
		);
	});
	protected readonly previewName = computed(
		() => this.draft().name.trim() || this.user()?.username || ""
	);

	ngOnInit() {
		this.hydrate();
		this.authService.loadUser().subscribe(() => this.hydrate());
	}

	protected selectAvatar(url: string) {
		this.draft.update(draft => ({ ...draft, avatarUrl: url }));
	}

	protected discard() {
		this.draft.set(this.saved());
	}

	protected save() {
		if (this.profileForm().invalid()) return;
		const draft = this.draft();
		const dto: UpdateProfileDto = {
			name: draft.name.trim() || undefined,
			bio: draft.bio.trim() || undefined,
			avatarUrl: draft.avatarUrl || undefined
		};
		this.saving.set(true);
		this.profileService.update(dto).subscribe({
			next: () => {
				this.saving.set(false);
				this.saved.set(draft);
				this.toast.success("Profile updated.");
				this.authService.loadUser().subscribe();
			},
			error: () => {
				this.saving.set(false);
				this.toast.warning("Could not update profile.");
			}
		});
	}

	private hydrate() {
		const user = this.user();
		if (!user || this.hasChanges()) return;
		const snapshot: ProfileDraft = {
			name: user.name ?? "",
			bio: user.bio ?? "",
			avatarUrl: user.avatarUrl ?? ""
		};
		this.saved.set(snapshot);
		this.draft.set(snapshot);
	}
}
