import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { DatePipe } from "@angular/common";
import type { AuditLogEntry } from "../admin.service";
import { AdminService } from "../admin.service";

@Component({
	selector: "app-admin-audit",
	imports: [DatePipe],
	templateUrl: "./admin-audit.html",
	styleUrl: "./admin-audit.css",
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

	ngOnInit() {
		this.loadLogs();
	}

	nextPage() {
		this.offset.update(o => o + this.limit);
		this.loadLogs();
	}

	prevPage() {
		this.offset.update(o => Math.max(0, o - this.limit));
		this.loadLogs();
	}

	private loadLogs() {
		this.isLoading.set(true);
		this.adminService.getAuditLog(this.limit, this.offset()).subscribe({
			next: res => {
				this.logs.set(res.logs);
				this.total.set(res.total);
				this.isLoading.set(false);
			},
			error: () => this.isLoading.set(false)
		});
	}
}
