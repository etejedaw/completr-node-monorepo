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
import {
	UiButton,
	UiFormField,
	UiInput,
	UiLabel,
	UiTextarea
} from "../../../shared/ui";

@Component({
	selector: "app-settings-profile",
	imports: [
		FormsModule,
		UiButton,
		UiInput,
		UiTextarea,
		UiFormField,
		UiLabel
	],
	templateUrl: "./settings-profile.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsProfile implements OnInit {
	private readonly authService = inject(AuthService);
	private readonly profileService = inject(ProfileService);
	private readonly toast = inject(ToastService);

	protected readonly user = this.authService.user;
	protected readonly name = signal("");
	protected readonly bio = signal("");
	protected readonly avatarUrl = signal("");
	protected readonly saving = signal(false);

	protected readonly AVATARS = Array.from({ length: 15 }, (_, i) => {
		const n = String(i + 1).padStart(2, "0");
		return `/avatars/completr_profile_${n}.png`;
	});

	selectAvatar(url: string) {
		this.avatarUrl.set(url);
	}

	clearAvatar() {
		this.avatarUrl.set("");
	}

	ngOnInit() {
		this.authService.loadUser().subscribe(() => this.hydrate());
		this.hydrate();
	}

	private hydrate() {
		const u = this.user();
		if (!u) return;
		this.name.set(u.name ?? "");
		this.bio.set(u.bio ?? "");
		this.avatarUrl.set(u.avatarUrl ?? "");
	}

	save() {
		this.saving.set(true);
		const dto: UpdateProfileDto = {
			name: this.name() || undefined,
			bio: this.bio() || undefined,
			avatarUrl: this.avatarUrl() || undefined
		};
		this.profileService.update(dto).subscribe({
			next: () => {
				this.saving.set(false);
				this.toast.success("Profile updated.");
				this.authService.loadUser().subscribe();
			},
			error: () => {
				this.saving.set(false);
				this.toast.warning("Could not update profile.");
			}
		});
	}
}
