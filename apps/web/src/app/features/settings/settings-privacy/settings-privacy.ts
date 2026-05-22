import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { AuthService } from "../../../core/services/auth.service";
import {
	ProfileService,
	UpdateProfileDto
} from "../../profile/profile.service";
import { ToastService } from "../../../core/services/toast.service";
import { UiButton, UiSwitch } from "../../../shared/ui";

type PrivacyMode = "private" | "custom" | "open";

@Component({
	selector: "app-settings-privacy",
	imports: [UiButton, UiSwitch],
	templateUrl: "./settings-privacy.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPrivacy implements OnInit {
	private readonly authService = inject(AuthService);
	private readonly profileService = inject(ProfileService);
	private readonly toast = inject(ToastService);

	protected readonly user = this.authService.user;
	protected readonly isPublic = signal(true);
	protected readonly isBacklogPublic = signal(true);
	protected readonly isShelfPublic = signal(true);
	protected readonly isListPublic = signal(true);
	protected readonly isQueuePublic = signal(true);
	protected readonly isWishlistPublic = signal(true);
	protected readonly isFavoritePublic = signal(true);
	protected readonly isFeedPublic = signal(true);
	protected readonly saving = signal(false);
	protected readonly mode = signal<PrivacyMode>("open");

	protected readonly showCustomPanel = computed(() => this.mode() === "custom");

	ngOnInit() {
		this.authService.loadUser().subscribe(() => this.hydrate());
		this.hydrate();
	}

	private hydrate() {
		const u = this.user();
		if (!u) return;
		this.isPublic.set(u.isPublic);
		this.isBacklogPublic.set(u.isBacklogPublic);
		this.isShelfPublic.set(u.isShelfPublic);
		this.isListPublic.set(u.isListPublic);
		this.isQueuePublic.set(u.isQueuePublic);
		this.isWishlistPublic.set(u.isWishlistPublic);
		this.isFavoritePublic.set(u.isFavoritePublic);
		this.isFeedPublic.set(u.isFeedPublic);
		this.mode.set(this.deriveMode());
	}

	private deriveMode(): PrivacyMode {
		if (!this.isPublic()) return "private";
		const allOn =
			this.isBacklogPublic() &&
			this.isShelfPublic() &&
			this.isListPublic() &&
			this.isQueuePublic() &&
			this.isWishlistPublic() &&
			this.isFavoritePublic() &&
			this.isFeedPublic();
		return allOn ? "open" : "custom";
	}

	selectPreset(mode: PrivacyMode) {
		this.mode.set(mode);
		if (mode === "private") {
			this.isPublic.set(false);
			this.setSectionFlags(false);
		} else if (mode === "open") {
			this.isPublic.set(true);
			this.setSectionFlags(true);
		}
	}

	onSectionFlagChange() {
		this.mode.set(this.deriveMode());
	}

	private setSectionFlags(value: boolean) {
		this.isBacklogPublic.set(value);
		this.isShelfPublic.set(value);
		this.isListPublic.set(value);
		this.isQueuePublic.set(value);
		this.isWishlistPublic.set(value);
		this.isFavoritePublic.set(value);
		this.isFeedPublic.set(value);
	}

	save() {
		this.saving.set(true);
		const dto: UpdateProfileDto = {
			isPublic: this.isPublic(),
			isBacklogPublic: this.isBacklogPublic(),
			isShelfPublic: this.isShelfPublic(),
			isListPublic: this.isListPublic(),
			isQueuePublic: this.isQueuePublic(),
			isWishlistPublic: this.isWishlistPublic(),
			isFavoritePublic: this.isFavoritePublic(),
			isFeedPublic: this.isFeedPublic()
		};
		this.profileService.update(dto).subscribe({
			next: () => {
				this.saving.set(false);
				this.toast.success("Privacy settings updated.");
				this.authService.loadUser().subscribe();
			},
			error: () => {
				this.saving.set(false);
				this.toast.warning("Could not update settings.");
			}
		});
	}
}
