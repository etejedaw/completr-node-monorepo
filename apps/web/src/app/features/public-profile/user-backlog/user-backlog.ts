import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { DatePipe } from "@angular/common";
import { Subject, debounceTime, distinctUntilChanged } from "rxjs";
import { AuthService } from "../../../core/services/auth.service";
import { PublicProfileService } from "../public-profile.service";
import { BacklogEntry, BacklogStatus } from "../../../core/models";
import { StarRating } from "../../../shared/components/star-rating/star-rating";

const PAGE_SIZE = 50;

@Component({
	selector: "app-user-backlog",
	imports: [RouterLink, DatePipe, StarRating],
	templateUrl: "./user-backlog.html",
	styleUrl: "./user-backlog.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserBacklog implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly profileService = inject(PublicProfileService);
	private readonly authService = inject(AuthService);

	protected readonly username = signal("");
	protected readonly entries = signal<BacklogEntry[]>([]);
	protected readonly total = signal(0);
	protected readonly searchQuery = signal("");
	protected readonly offset = signal(0);
	protected readonly isLoading = signal(true);
	protected readonly error = signal<"not_found" | "private" | null>(null);
	protected readonly isLoggedIn = this.authService.isLoggedIn;
	protected readonly activeStatus = signal("");
	protected readonly limit = PAGE_SIZE;
	protected readonly Math = Math;

	private readonly searchSubject = new Subject<string>();

	protected readonly statusTabs = [
		{ label: "All", value: "" },
		{ label: "Not Started", value: "not_started" },
		{ label: "Playing", value: "playing" },
		{ label: "Completed", value: "completed" },
		{ label: "Abandoned", value: "abandoned" }
	];

	ngOnInit() {
		this.searchSubject
			.pipe(debounceTime(300), distinctUntilChanged())
			.subscribe(query => {
				this.searchQuery.set(query);
				this.offset.set(0);
				this.load();
			});

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
		this.username.set(username);
		this.load();
	}

	onSearch(event: Event) {
		this.searchSubject.next((event.target as HTMLInputElement).value);
	}

	filterByStatus(status: string) {
		this.activeStatus.set(status);
		this.offset.set(0);
		this.load();
	}

	prevPage() {
		this.offset.set(Math.max(0, this.offset() - this.limit));
		this.load();
	}

	nextPage() {
		this.offset.set(this.offset() + this.limit);
		this.load();
	}

	statusClass(status: BacklogStatus): string {
		const map: Record<BacklogStatus, string> = {
			not_started: "status-not-started",
			playing: "status-playing",
			completed: "status-completed",
			abandoned: "status-abandoned"
		};
		return map[status] ?? "";
	}

	statusLabel(status: BacklogStatus): string {
		const map: Record<BacklogStatus, string> = {
			not_started: "Not Started",
			playing: "Playing",
			completed: "Completed",
			abandoned: "Abandoned"
		};
		return map[status] ?? status;
	}

	private load() {
		this.isLoading.set(true);
		this.error.set(null);

		const filters: Record<string, string | number> = {
			limit: this.limit,
			offset: this.offset()
		};
		if (this.activeStatus()) filters["status"] = this.activeStatus();
		if (this.searchQuery()) filters["search"] = this.searchQuery();

		this.profileService.getUserBacklog(this.username(), filters).subscribe({
			next: result => {
				this.entries.set(result.items);
				this.total.set(result.total);
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
