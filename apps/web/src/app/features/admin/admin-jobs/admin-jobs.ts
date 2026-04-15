import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { AdminService, type JobEntry } from "../admin.service";

@Component({
	selector: "app-admin-jobs",
	imports: [DatePipe],
	templateUrl: "./admin-jobs.html",
	styleUrl: "./admin-jobs.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminJobs implements OnInit {
	private readonly adminService = inject(AdminService);

	protected readonly jobs = signal<JobEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly starting = signal(false);

	ngOnInit() {
		this.loadJobs();
	}

	startPopulateRawg() {
		this.starting.set(true);
		this.adminService.startPopulateRawg().subscribe({
			next: () => {
				this.starting.set(false);
				this.loadJobs();
			},
			error: () => this.starting.set(false)
		});
	}

	refresh() {
		this.loadJobs();
	}

	private loadJobs() {
		this.isLoading.set(true);
		this.adminService.getJobs().subscribe({
			next: jobs => {
				this.jobs.set(jobs);
				this.isLoading.set(false);
			},
			error: () => this.isLoading.set(false)
		});
	}
}
