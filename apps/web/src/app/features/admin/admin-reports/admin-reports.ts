import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { DatePipe } from "@angular/common";
import { AdminService, GameReport } from "../admin.service";
import { UiButton } from "../../../shared/ui";

@Component({
	selector: "app-admin-reports",
	imports: [RouterLink, DatePipe, UiButton],
	templateUrl: "./admin-reports.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminReports implements OnInit {
	private readonly adminService = inject(AdminService);
	private readonly route = inject(ActivatedRoute);

	protected readonly reports = signal<GameReport[]>([]);
	protected readonly isLoading = signal(true);
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
		this.adminService.updateReportStatus(report.id, "approved").subscribe({
			next: () =>
				this.reports.update(list =>
					list.filter(r => r.id !== report.id)
				)
		});
	}

	reject(report: GameReport) {
		this.adminService.updateReportStatus(report.id, "rejected").subscribe({
			next: () =>
				this.reports.update(list =>
					list.filter(r => r.id !== report.id)
				)
		});
	}

	private loadReports() {
		this.isLoading.set(true);
		this.adminService.getPendingReports().subscribe({
			next: reports => {
				const gameId = this.filterGameId();
				this.reports.set(
					gameId ? reports.filter(r => r.gameId === gameId) : reports
				);
				this.isLoading.set(false);
			},
			error: () => this.isLoading.set(false)
		});
	}
}
