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
