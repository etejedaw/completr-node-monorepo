import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { Game } from "../../../core/models";
import { GamesService } from "../../games/games.service";
import { AdminService } from "../admin.service";
import { UiSearchBar } from "../../../shared/ui";

@Component({
	selector: "app-admin-games",
	imports: [RouterLink, UiSearchBar],
	templateUrl: "./admin-games.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminGames implements OnInit {
	private readonly gamesService = inject(GamesService);
	private readonly adminService = inject(AdminService);
	private readonly router = inject(Router);

	protected readonly Math = Math;
	protected readonly games = signal<Game[]>([]);
	protected readonly reportedGameIds = signal<Set<string>>(new Set());
	protected readonly total = signal(0);
	protected readonly isLoading = signal(true);
	protected readonly searchQuery = signal("");
	protected readonly offset = signal(0);
	protected readonly limit = 50;
	protected readonly noScores = signal(false);
	protected readonly noTimes = signal(false);
	protected readonly noPlatforms = signal(false);

	ngOnInit() {
		this.loadGames();
		this.loadReports();
	}

	toggleFilter(filter: "noScores" | "noTimes" | "noPlatforms") {
		this[filter].update(v => !v);
		this.offset.set(0);
		this.loadGames();
	}

	goToGameReport(gameId: string) {
		this.router.navigate(["/admin/reports"], {
			queryParams: { gameId }
		});
	}

	onSearch(query: string) {
		this.searchQuery.set(query);
		this.offset.set(0);

		if (query.length >= 2) {
			this.isLoading.set(true);
			this.gamesService.search(query).subscribe({
				next: games => {
					this.games.set(games);
					this.total.set(games.length);
					this.isLoading.set(false);
				},
				error: () => this.isLoading.set(false)
			});
		} else if (query.length === 0) {
			this.loadGames();
		}
	}

	nextPage() {
		this.offset.update(o => o + this.limit);
		this.loadGames();
	}

	prevPage() {
		this.offset.update(o => Math.max(0, o - this.limit));
		this.loadGames();
	}

	private loadReports() {
		this.adminService.getPendingReports().subscribe({
			next: reports => {
				const ids = new Set(reports.map(r => r.gameId));
				this.reportedGameIds.set(ids);
			}
		});
	}

	private loadGames() {
		this.isLoading.set(true);
		const query: Record<string, unknown> = {
			limit: this.limit,
			offset: this.offset(),
			sort_by: "createdAt",
			sort_order: "desc"
		};
		if (this.noScores()) query["no_scores"] = true;
		if (this.noTimes()) query["no_times"] = true;
		if (this.noPlatforms()) query["no_platforms"] = true;
		this.gamesService.getGames(query).subscribe({
			next: res => {
				this.games.set(res.data.games);
				this.total.set(res.data.total);
				this.isLoading.set(false);
			},
			error: () => this.isLoading.set(false)
		});
	}
}
