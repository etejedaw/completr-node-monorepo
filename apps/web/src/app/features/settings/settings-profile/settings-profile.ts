import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { form, FormField } from "@angular/forms/signals";
import { AuthService } from "../../../core/services/auth";
import { ProfileService, UpdateProfileDto } from "../../profile/profile";
import { ToastService } from "../../../core/services/toast";
import {
	UiButton,
	UiFormField,
	UiInput,
	UiLabel,
	UiTextarea
} from "../../../shared/ui";

@Component({
	selector: "app-settings-profile",
	imports: [FormField, UiButton, UiInput, UiTextarea, UiFormField, UiLabel],
	templateUrl: "./settings-profile.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsProfile implements OnInit {
	private readonly authService = inject(AuthService);
	private readonly profileService = inject(ProfileService);
	private readonly toast = inject(ToastService);

	protected readonly user = this.authService.user;
	protected readonly model = signal({ name: "", bio: "", avatarUrl: "" });
	readonly form = form(this.model);
	protected readonly avatarUrl = computed(() =>
		this.form.avatarUrl().value()
	);
	protected readonly saving = signal(false);

	protected readonly AVATARS = Array.from({ length: 15 }, (_, i) => {
		const n = String(i + 1).padStart(2, "0");
		return `/avatars/completr_profile_${n}.png`;
	});

	selectAvatar(url: string) {
		this.model.update(m => ({ ...m, avatarUrl: url }));
	}

	clearAvatar() {
		this.model.update(m => ({ ...m, avatarUrl: "" }));
	}

	ngOnInit() {
		this.authService.loadUser().subscribe(() => this.hydrate());
		this.hydrate();
	}

	private hydrate() {
		const u = this.user();
		if (!u) return;
		this.model.set({
			name: u.name ?? "",
			bio: u.bio ?? "",
			avatarUrl: u.avatarUrl ?? ""
		});
	}

	save() {
		this.saving.set(true);
		const v = this.form().value();
		const dto: UpdateProfileDto = {
			name: v.name || undefined,
			bio: v.bio || undefined,
			avatarUrl: v.avatarUrl || undefined
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
