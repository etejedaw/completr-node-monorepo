import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { PublicProfileService, PublicProfile } from "./public-profile.service";
import {
	UserListModal,
	UserSummary
} from "../../shared/components/user-list-modal/user-list-modal";
import { StarRating } from "../../shared/components/star-rating/star-rating";
import { UiButton, UiTabs, UiTabList, UiTab, UiTabPanel } from "../../shared/ui";
import { activityLabel } from "../../shared/utils/activity-labels";

import { PublicTopbar } from "../../shared/components/public-topbar/public-topbar";
@Component({
	selector: "app-public-profile",
	imports: [RouterLink, UserListModal, StarRating, UiButton, UiTabs, UiTabList, UiTab, UiTabPanel, PublicTopbar],
	templateUrl: "./public-profile.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicProfileComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly profileService = inject(PublicProfileService);
	private readonly authService = inject(AuthService);

	protected readonly profile = signal<PublicProfile | null>(null);
	protected readonly isLoading = signal(true);
	protected readonly isPrivate = signal(false);
	protected readonly notFound = signal(false);
	protected readonly username = signal("");
	protected readonly isLoggedIn = this.authService.isLoggedIn;
	protected readonly isSelf = computed(
		() => this.authService.user()?.id === this.profile()?.user.id
	);
	protected readonly togglingFollow = signal(false);
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
			reviews: this.userReviews().length
		};
	});
	protected readonly userReviews = signal<
		{
			id: string;
			content?: string;
			rating?: number;
			playthroughDuration?: number | null;
			game: { id: string; code: string; title: string } | null;
			createdAt: string;
		}[]
	>([]);
	protected readonly userReviewsTotal = signal(0);
	protected readonly showUserListModal = signal(false);
	protected readonly userListTitle = signal("");
	protected readonly userListUsers = signal<UserSummary[]>([]);

	ngOnInit() {
		if (this.authService.token() && !this.authService.user()) {
			this.authService.loadUser().subscribe({
				next: () => this.init(),
				error: () => this.init()
			});
		} else {
			this.init();
		}
	}

	private init() {
		this.route.paramMap.subscribe(params => {
			const raw = params.get("username") ?? "";
			this.username.set(raw);
			this.loadProfile(raw);
		});
	}

	toggleFollow() {
		const p = this.profile();
		const u = this.username();
		if (!p || this.togglingFollow()) return;

		this.togglingFollow.set(true);
		const action = p.isFollowing
			? this.profileService.unfollow(u)
			: this.profileService.follow(u);

		action.subscribe({
			next: () => {
				this.profile.update(prev =>
					prev
						? {
								...prev,
								isFollowing: !prev.isFollowing,
								followerCount:
									prev.followerCount +
									(prev.isFollowing ? -1 : 1)
							}
						: prev
				);
				this.togglingFollow.set(false);
			},
			error: () => this.togglingFollow.set(false)
		});
	}

	showFollowers() {
		this.userListTitle.set("Followers");
		this.userListUsers.set([]);
		this.showUserListModal.set(true);
		this.profileService
			.getFollowers(this.username())
			.subscribe(users => this.userListUsers.set(users));
	}

	showFollowing() {
		this.userListTitle.set("Following");
		this.userListUsers.set([]);
		this.showUserListModal.set(true);
		this.profileService
			.getFollowing(this.username())
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

	private loadProfile(username: string) {
		this.isLoading.set(true);
		this.isPrivate.set(false);
		this.notFound.set(false);
		this.profile.set(null);

		this.profileService.getProfile(username).subscribe({
			next: data => {
				this.profile.set(data);
				this.isLoading.set(false);
				this.profileService
					.getUserReviews(username, { limit: 5 })
					.subscribe(r => {
						this.userReviews.set(r.reviews);
						this.userReviewsTotal.set(r.total);
					});
			},
			error: err => {
				if (err.status === 403) this.isPrivate.set(true);
				else if (err.status === 404) this.notFound.set(true);
				this.isLoading.set(false);
			}
		});
	}
}
