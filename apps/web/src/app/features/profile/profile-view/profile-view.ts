import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../../core/services/auth.service";
import { ProfileService, UpdateProfileDto } from "../profile.service";
import {
	PublicProfileService,
	PublicProfile
} from "../../public-profile/public-profile.service";
import {
	UserListModal,
	type UserSummary
} from "../../../shared/components/user-list-modal/user-list-modal";

@Component({
	selector: "app-profile-view",
	imports: [FormsModule, RouterLink, UserListModal],
	templateUrl: "./profile-view.html",
	styleUrl: "./profile-view.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileView implements OnInit {
	private readonly authService = inject(AuthService);
	private readonly profileService = inject(ProfileService);
	private readonly publicProfileService = inject(PublicProfileService);

	protected readonly user = this.authService.user;
	protected readonly profile = signal<PublicProfile | null>(null);
	protected readonly isLoading = signal(true);

	// User list modal
	protected readonly showUserListModal = signal(false);
	protected readonly userListTitle = signal("");
	protected readonly userListUsers = signal<UserSummary[]>([]);

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
		this.authService.loadUser().subscribe({
			next: () => this.loadProfile(),
			error: () => this.loadProfile()
		});
	}

	showFollowers() {
		const username = this.user()?.username;
		if (!username) return;
		this.userListTitle.set("Followers");
		this.userListUsers.set([]);
		this.showUserListModal.set(true);
		this.publicProfileService
			.getFollowers(username)
			.subscribe(users => this.userListUsers.set(users));
	}

	showFollowing() {
		const username = this.user()?.username;
		if (!username) return;
		this.userListTitle.set("Following");
		this.userListUsers.set([]);
		this.showUserListModal.set(true);
		this.publicProfileService
			.getFollowing(username)
			.subscribe(users => this.userListUsers.set(users));
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
				this.authService.loadUser().subscribe(() => this.loadProfile());
			},
			error: () => this.saving.set(false)
		});
	}

	protected activityLabel(type: string): string {
		const labels: Record<string, string> = {
			backlog_added: "added to backlog",
			backlog_playing: "started playing",
			backlog_completed: "completed",
			backlog_abandoned: "abandoned",
			favorite_added: "added to favorites",
			list_created: "created a list",
			list_followed: "followed a list",
			user_followed: "followed a user"
		};
		return labels[type] ?? type;
	}

	protected timeAgo(date: string): string {
		const diff = Date.now() - new Date(date).getTime();
		const minutes = Math.floor(diff / 60000);
		if (minutes < 1) return "just now";
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	protected get memberSince(): string {
		const date = this.profile()?.user.createdAt;
		if (!date) return "";
		return new Date(date).toLocaleDateString("en-US", {
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

	private loadProfile() {
		const username = this.user()?.username;
		if (!username) return;

		this.isLoading.set(true);
		this.publicProfileService.getProfile(username).subscribe({
			next: data => {
				this.profile.set(data);
				this.isLoading.set(false);
			},
			error: () => this.isLoading.set(false)
		});
	}
}
