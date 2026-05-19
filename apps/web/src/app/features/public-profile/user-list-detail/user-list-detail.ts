import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { AuthService } from "../../../core/services/auth.service";
import { PublicProfileService } from "../public-profile.service";
import { List } from "../../../core/models";

@Component({
	selector: "app-user-list-detail",
	imports: [RouterLink],
	templateUrl: "./user-list-detail.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserListDetail implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly profileService = inject(PublicProfileService);
	private readonly authService = inject(AuthService);

	protected readonly username = signal("");
	protected readonly profileUserName = signal("");
	protected readonly list = signal<List | null>(null);
	protected readonly isLoading = signal(true);
	protected readonly error = signal<"not_found" | "private" | null>(null);
	protected readonly isLoggedIn = this.authService.isLoggedIn;

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
		const username = this.route.snapshot.paramMap.get("username") ?? "";
		const listId = this.route.snapshot.paramMap.get("id") ?? "";
		this.username.set(username);
		this.load(username, listId);
	}

	protected get progressPercent(): number {
		const p = this.list()?.progress;
		if (!p || p.total === 0) return 0;
		return Math.round((p.completed / p.total) * 100);
	}

	private load(username: string, listId: string) {
		this.isLoading.set(true);
		this.error.set(null);
		this.profileService.getUserListDetail(username, listId).subscribe({
			next: result => {
				this.list.set(result.list);
				this.profileUserName.set(
					result.profileUser.name || result.profileUser.username
				);
				this.isLoading.set(false);
			},
			error: err => {
				if (err.status === 403) this.error.set("private");
				else if (err.status === 404) this.error.set("not_found");
				this.isLoading.set(false);
			}
		});
	}
}
