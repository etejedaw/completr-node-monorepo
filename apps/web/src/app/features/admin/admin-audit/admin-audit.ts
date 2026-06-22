import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import type { AuditLogEntry } from "../admin.service";
import { AdminService } from "../admin.service";
import { UiPagination, UiSelect } from "../../../shared/ui";

const ACTION_OPTIONS = [
	"user_created",
	"user_edited",
	"game_created",
	"game_edited",
	"game_deleted",
	"game_deactivated",
	"job_started",
	"report_approved",
	"report_rejected"
];

const TARGET_TYPE_OPTIONS = ["game", "user", "report", "job"];

@Component({
	selector: "app-admin-audit",
	imports: [DatePipe, RouterLink, UiPagination, UiSelect],
	templateUrl: "./admin-audit.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminAudit implements OnInit {
	private readonly adminService = inject(AdminService);

	protected readonly Math = Math;
	protected readonly logs = signal<AuditLogEntry[]>([]);
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly isLoading = signal(true);
	protected readonly limit = 50;
	protected readonly actionFilter = signal<string>("");
	protected readonly targetTypeFilter = signal<string>("");
	protected readonly actionOptions = ACTION_OPTIONS;
	protected readonly targetTypeOptions = TARGET_TYPE_OPTIONS;

	ngOnInit() {
		this.loadLogs();
	}

	goToOffset(offset: number) {
		this.offset.set(offset);
		this.loadLogs();
	}

	setActionFilter(action: string) {
		this.actionFilter.set(action);
		this.offset.set(0);
		this.loadLogs();
	}

	setTargetTypeFilter(targetType: string) {
		this.targetTypeFilter.set(targetType);
		this.offset.set(0);
		this.loadLogs();
	}

	clearFilters() {
		this.actionFilter.set("");
		this.targetTypeFilter.set("");
		this.offset.set(0);
		this.loadLogs();
	}

	private loadLogs() {
		this.isLoading.set(true);
		this.adminService
			.getAuditLog(this.limit, this.offset(), {
				action: this.actionFilter() || undefined,
				targetType: this.targetTypeFilter() || undefined
			})
			.subscribe({
				next: res => {
					this.logs.set(res.logs);
					this.total.set(res.total);
					this.isLoading.set(false);
				},
				error: () => this.isLoading.set(false)
			});
	}
}
