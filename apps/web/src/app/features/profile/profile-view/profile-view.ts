import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../../core/services/auth.service";
import { ProfileService, UpdateProfileDto } from "../profile.service";

@Component({
	selector: "app-profile-view",
	imports: [FormsModule],
	templateUrl: "./profile-view.html",
	styleUrl: "./profile-view.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileView implements OnInit {
	private readonly authService = inject(AuthService);
	private readonly profileService = inject(ProfileService);

	protected readonly user = this.authService.user;

	// Edit modal
	protected readonly showModal = signal(false);
	protected readonly editName = signal("");
	protected readonly editBio = signal("");
	protected readonly editAvatarUrl = signal("");
	protected readonly editIsPublic = signal(true);
	protected readonly editIsWishlistPublic = signal(true);
	protected readonly editIsFavoritePublic = signal(true);
	protected readonly editIsFeedPublic = signal(true);
	protected readonly saving = signal(false);

	ngOnInit() {
		this.authService.loadUser().subscribe();
	}

	openEdit() {
		const u = this.user();
		if (!u) return;
		this.editName.set(u.name ?? "");
		this.editBio.set(u.bio ?? "");
		this.editAvatarUrl.set(u.avatarUrl ?? "");
		this.editIsPublic.set(u.isPublic);
		this.editIsWishlistPublic.set(u.isWishlistPublic);
		this.editIsFavoritePublic.set(u.isFavoritePublic);
		this.editIsFeedPublic.set(u.isFeedPublic);
		this.showModal.set(true);
	}

	closeModal() {
		this.showModal.set(false);
	}

	saveProfile() {
		this.saving.set(true);
		const dto: UpdateProfileDto = {
			name: this.editName() || undefined,
			bio: this.editBio() || undefined,
			avatarUrl: this.editAvatarUrl() || undefined,
			isPublic: this.editIsPublic(),
			isWishlistPublic: this.editIsWishlistPublic(),
			isFavoritePublic: this.editIsFavoritePublic(),
			isFeedPublic: this.editIsFeedPublic()
		};

		this.profileService.update(dto).subscribe({
			next: () => {
				this.saving.set(false);
				this.showModal.set(false);
				this.authService.loadUser().subscribe();
			},
			error: () => this.saving.set(false)
		});
	}

	protected get memberSince(): string {
		const u = this.user();
		if (!u?.createdAt) return "";
		return new Date(u.createdAt).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long"
		});
	}

	protected get roleBadge(): string {
		const map: Record<string, string> = {
			admin: "Admin",
			moderator: "Moderator",
			premium: "Premium",
			user: "Free"
		};
		return map[this.user()?.role ?? "user"] ?? "Free";
	}
}
