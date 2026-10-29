import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { type Subscription } from "rxjs";

import { ToastService } from "../../../core/services/toast";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { UiButton, UiEmptyState, UiSkeleton } from "../../../shared/ui";
import { type GameReport } from "../services/reports.model";
import { ReportsService } from "../services/reports.service";

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
	private readonly toast = inject(ToastService);
	private loadSubscription: Subscription | null = null;

	protected readonly reports = signal<GameReport[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly loadFailed = signal(false);
	protected readonly skeletonRows = [1, 2, 3];
	protected readonly filterGameId = signal<string | null>(null);
	protected readonly busyReportIds = signal<ReadonlySet<string>>(new Set());

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
		this.resolve(report, "approved");
	}

	reject(report: GameReport) {
		this.resolve(report, "rejected");
	}

	reload() {
		this.loadReports();
	}

	protected isBusy(reportId: string) {
		return this.busyReportIds().has(reportId);
	}

	private resolve(report: GameReport, status: "approved" | "rejected") {
		if (this.isBusy(report.id)) return;
		this.setBusy(report.id, true);

		this.reportsService.updateReportStatus(report.id, status).subscribe({
			next: () => {
				this.setBusy(report.id, false);
				this.reports.update(list =>
					list.filter(r => r.id !== report.id)
				);
			},
			error: () => {
				this.setBusy(report.id, false);
				this.toast.warning("Could not update the report.");
			}
		});
	}

	private setBusy(reportId: string, busy: boolean) {
		this.busyReportIds.update(ids => {
			const next = new Set(ids);
			if (busy) next.add(reportId);
			else next.delete(reportId);
			return next;
		});
	}

	private loadReports() {
		this.loadSubscription?.unsubscribe();
		this.isLoading.set(true);
		this.loadFailed.set(false);
		this.loadSubscription = this.reportsService
			.getPendingReports()
			.subscribe({
				next: reports => {
					const gameId = this.filterGameId();
					this.reports.set(
						gameId
							? reports.filter(r => r.gameId === gameId)
							: reports
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
