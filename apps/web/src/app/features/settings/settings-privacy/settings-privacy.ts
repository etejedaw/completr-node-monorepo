import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../../core/services/auth.service";
import {
	ProfileService,
	UpdateProfileDto
} from "../../profile/profile.service";
import { ToastService } from "../../../core/services/toast.service";
import { UiButton } from "../../../shared/ui";

@Component({
	selector: "app-settings-privacy",
	imports: [FormsModule, UiButton],
	templateUrl: "./settings-privacy.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPrivacy implements OnInit {
	private readonly authService = inject(AuthService);
	private readonly profileService = inject(ProfileService);
	private readonly toast = inject(ToastService);

	protected readonly user = this.authService.user;
	protected readonly isPublic = signal(true);
	protected readonly isQueuePublic = signal(true);
	protected readonly isWishlistPublic = signal(true);
	protected readonly isFavoritePublic = signal(true);
	protected readonly isFeedPublic = signal(true);
	protected readonly saving = signal(false);

	ngOnInit() {
		this.authService.loadUser().subscribe(() => this.hydrate());
		this.hydrate();
	}

	private hydrate() {
		const u = this.user();
		if (!u) return;
		this.isPublic.set(u.isPublic);
		this.isQueuePublic.set(u.isQueuePublic);
		this.isWishlistPublic.set(u.isWishlistPublic);
		this.isFavoritePublic.set(u.isFavoritePublic);
		this.isFeedPublic.set(u.isFeedPublic);
	}

	save() {
		this.saving.set(true);
		const dto: UpdateProfileDto = {
			isPublic: this.isPublic(),
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
