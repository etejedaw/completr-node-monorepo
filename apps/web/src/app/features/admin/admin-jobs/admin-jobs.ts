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
	protected readonly starting = signal("");

	ngOnInit() {
		this.loadJobs();
	}

	startJob(type: string) {
		this.starting.set(type);
		const actions: Record<
			string,
			() => ReturnType<typeof this.adminService.startPopulateRawg>
		> = {
			populate_rawg: () => this.adminService.startPopulateRawg(2),
			calculate_ratings: () => this.adminService.startCalculateRatings(),
			calculate_durations: () =>
				this.adminService.startCalculateDurations()
		};

		const action = actions[type];
		if (!action) return;

		action().subscribe({
			next: () => {
				this.starting.set("");
				this.loadJobs();
			},
			error: () => this.starting.set("")
		});
	}

	cancelJob(jobId: string) {
		this.adminService.cancelJob(jobId).subscribe(() => this.loadJobs());
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
