import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../../core/services/auth.service";
import {
	PublicProfileService,
	PublicProfile
} from "../../public-profile/public-profile.service";
import {
	UserListModal,
	type UserSummary
} from "../../../shared/components/user-list-modal/user-list-modal";
import { StarRating } from "../../../shared/components/star-rating/star-rating";
import {
	UiButton,
	UiTabs,
	UiTabList,
	UiTab,
	UiTabPanel
} from "../../../shared/ui";
import { activityLabel } from "../../../shared/utils/activity-labels";

@Component({
	selector: "app-profile-view",
	imports: [RouterLink, UserListModal, StarRating, UiButton, UiTabs, UiTabList, UiTab, UiTabPanel],
	templateUrl: "./profile-view.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileView implements OnInit {
	private readonly authService = inject(AuthService);
	private readonly publicProfileService = inject(PublicProfileService);

	protected readonly user = this.authService.user;
	protected readonly profile = signal<PublicProfile | null>(null);
	protected readonly isLoading = signal(true);
	protected readonly activeTab = signal("backlog");

	protected readonly stats = computed(() => {
		const p = this.profile();
		if (!p) return { completed: 0, playing: 0, lists: 0, reviews: 0 };
		const completed = p.backlogs.filter(b => b.status === "completed").length;
		const playing = p.backlogs.filter(b => b.status === "playing").length;
		return {
			completed,
			playing,
			lists: p.lists.length,
			reviews: this.userReviewsTotal()
		};
	});
	protected readonly userReviews = signal<
		{
			id: string;
			content?: string;
			rating?: number;
			game: { id: string; code: string; title: string } | null;
			createdAt: string;
		}[]
	>([]);
	protected readonly userReviewsTotal = signal(0);

	protected readonly showUserListModal = signal(false);
	protected readonly userListTitle = signal("");
	protected readonly userListUsers = signal<UserSummary[]>([]);

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

	protected activityLabel = activityLabel;

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
				this.publicProfileService
					.getUserReviews(username, { limit: 5 })
					.subscribe(r => {
						this.userReviews.set(r.reviews);
						this.userReviewsTotal.set(r.total);
					});
			},
			error: () => this.isLoading.set(false)
		});
	}
}
