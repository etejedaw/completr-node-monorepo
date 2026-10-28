import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";

import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { UiButton, UiEmptyState, UiSkeleton } from "../../../shared/ui";
import { type GameReport, ReportsService } from "../services/reports.service";

@Component({
	selector: "app-admin-reports",
	imports: [
		RouterLink,
		DatePipe,
		LibraryHero,
		UiButton,
		UiEmptyState,
		UiSkeleton
	],
	templateUrl: "./admin-reports.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminReports implements OnInit {
	private readonly reportsService = inject(ReportsService);
	private readonly route = inject(ActivatedRoute);

	protected readonly reports = signal<GameReport[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly loadFailed = signal(false);
	protected readonly skeletonRows = [1, 2, 3];
	protected readonly filterGameId = signal<string | null>(null);

	ngOnInit() {
		const gameId = this.route.snapshot.queryParamMap.get("gameId");
		this.filterGameId.set(gameId);
		this.loadReports();
	}

	clearFilter() {
		this.filterGameId.set(null);
		this.loadReports();
	}

	approve(report: GameReport) {
		this.reportsService
			.updateReportStatus(report.id, "approved")
			.subscribe({
				next: () =>
					this.reports.update(list =>
						list.filter(r => r.id !== report.id)
					)
			});
	}

	reject(report: GameReport) {
		this.reportsService
			.updateReportStatus(report.id, "rejected")
			.subscribe({
				next: () =>
					this.reports.update(list =>
						list.filter(r => r.id !== report.id)
					)
			});
	}

	reload() {
		this.loadReports();
	}

	private loadReports() {
		this.isLoading.set(true);
		this.loadFailed.set(false);
		this.reportsService.getPendingReports().subscribe({
			next: reports => {
				const gameId = this.filterGameId();
				this.reports.set(
					gameId ? reports.filter(r => r.gameId === gameId) : reports
				);
				this.isLoading.set(false);
			},
			error: () => {
				this.loadFailed.set(true);
				this.isLoading.set(false);
			}
		});
	}
}
