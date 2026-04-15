import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { PublicProfileService, PublicProfile } from "./public-profile.service";

@Component({
	selector: "app-public-profile",
	imports: [RouterLink],
	templateUrl: "./public-profile.html",
	styleUrl: "./public-profile.css",
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
	protected readonly togglingFollow = signal(false);

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

	protected activityLabel(type: string): string {
		const labels: Record<string, string> = {
			backlog_added: "added to backlog",
			backlog_playing: "started playing",
			backlog_completed: "completed",
			backlog_abandoned: "abandoned",
			favorite_added: "added to favorites",
			list_created: "created a list"
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

	private loadProfile(username: string) {
		this.isLoading.set(true);
		this.isPrivate.set(false);
		this.notFound.set(false);
		this.profile.set(null);

		this.profileService.getProfile(username).subscribe({
			next: data => {
				this.profile.set(data);
				this.isLoading.set(false);
			},
			error: err => {
				if (err.status === 403) this.isPrivate.set(true);
				else if (err.status === 404) this.notFound.set(true);
				this.isLoading.set(false);
			}
		});
	}
}
