import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { Game } from "../../../core/models";
import { GamesQuery, GamesService } from "../../games/games";
import { ReportsService } from "../services/reports.service";
import { ToastService } from "../../../core/services/toast";
import { UiPagination, UiSearchBar } from "../../../shared/ui";

@Component({
	selector: "app-admin-games",
	imports: [RouterLink, UiSearchBar, UiPagination],
	templateUrl: "./admin-games.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminGames implements OnInit {
	private readonly gamesService = inject(GamesService);
	private readonly reportsService = inject(ReportsService);
	private readonly router = inject(Router);
	private readonly toast = inject(ToastService);

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
	protected readonly noScoreSources = signal<Set<string>>(new Set());
	protected readonly noTimeSources = signal<Set<string>>(new Set());
	protected readonly activeFilter = signal<"active" | "inactive" | "all">(
		"active"
	);
	protected readonly reactivatingIds = signal<Set<string>>(new Set());

	protected readonly SCORE_SOURCES = ["metacritic", "opencritic", "rawg"];
	protected readonly TIME_SOURCES = ["hltb", "rawg"];

	ngOnInit() {
		this.loadGames();
		this.loadReports();
	}

	toggleFilter(filter: "noScores" | "noTimes" | "noPlatforms") {
		this[filter].update(v => !v);
		this.offset.set(0);
		this.loadGames();
	}

	setActiveFilter(value: "active" | "inactive" | "all") {
		this.activeFilter.set(value);
		this.offset.set(0);
		this.loadGames();
	}

	toggleScoreSource(source: string) {
		const next = new Set(this.noScoreSources());
		if (next.has(source)) next.delete(source);
		else next.add(source);
		this.noScoreSources.set(next);
		this.offset.set(0);
		this.loadGames();
	}

	toggleTimeSource(source: string) {
		const next = new Set(this.noTimeSources());
		if (next.has(source)) next.delete(source);
		else next.add(source);
		this.noTimeSources.set(next);
		this.offset.set(0);
		this.loadGames();
	}

	isReactivating(gameId: string): boolean {
		return this.reactivatingIds().has(gameId);
	}

	reactivate(game: Game) {
		if (this.isReactivating(game.id)) return;
		const updating = new Set(this.reactivatingIds());
		updating.add(game.id);
		this.reactivatingIds.set(updating);
		this.gamesService.reactivate(game.id).subscribe({
			next: () => {
				this.games.set(
					this.games().map(g =>
						g.id === game.id ? { ...g, isActive: true } : g
					)
				);
				const next = new Set(this.reactivatingIds());
				next.delete(game.id);
				this.reactivatingIds.set(next);
				this.toast.success(`Reactivated "${game.title}"`);
				if (this.activeFilter() === "inactive") this.loadGames();
			},
			error: () => {
				const next = new Set(this.reactivatingIds());
				next.delete(game.id);
				this.reactivatingIds.set(next);
				this.toast.warning("Could not reactivate game.");
			}
		});
	}

	goToGameReport(gameId: string) {
		this.router.navigate(["/admin/reports"], {
			queryParams: { gameId }
		});
	}

	onSearch(query: string) {
		this.searchQuery.set(query);
		this.offset.set(0);
		this.loadGames();
	}

	goToOffset(offset: number) {
		this.offset.set(offset);
		this.loadGames();
	}

	private loadReports() {
		this.reportsService.getPendingReports().subscribe({
			next: reports => {
				const ids = new Set(reports.map(r => r.gameId));
				this.reportedGameIds.set(ids);
			}
		});
	}

	private loadGames() {
		this.isLoading.set(true);
		const query: GamesQuery = {
			limit: this.limit,
			offset: this.offset(),
			sort_by: "createdAt",
			sort_order: "desc"
		};
		const search = this.searchQuery().trim();
		if (search.length > 0) query["search"] = search;
		if (this.noScores()) query["no_scores"] = true;
		if (this.noTimes()) query["no_times"] = true;
		if (this.noPlatforms()) query["no_platforms"] = true;
		if (this.activeFilter() === "all") query["include_inactive"] = true;
		if (this.activeFilter() === "inactive") query["only_inactive"] = true;
		const scoreSources = Array.from(this.noScoreSources());
		if (scoreSources.length > 0) query["no_score_source"] = scoreSources.join(",");
		const timeSources = Array.from(this.noTimeSources());
		if (timeSources.length > 0) query["no_time_source"] = timeSources.join(",");
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
