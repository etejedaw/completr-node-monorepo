import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { JobsService, type JobEntry } from "../services/jobs.service";
import { UiButton } from "../../../shared/ui";

@Component({
	selector: "app-admin-jobs",
	imports: [DatePipe, UiButton],
	templateUrl: "./admin-jobs.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminJobs implements OnInit {
	private readonly jobsService = inject(JobsService);

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
			() => ReturnType<typeof this.jobsService.startPopulateRawg>
		> = {
			populate_rawg: () => this.jobsService.startPopulateRawg(2),
			calculate_ratings: () => this.jobsService.startCalculateRatings(),
			calculate_durations: () =>
				this.jobsService.startCalculateDurations()
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
		this.jobsService.cancelJob(jobId).subscribe(() => this.loadJobs());
	}

	refresh() {
		this.loadJobs();
	}

	private loadJobs() {
		this.isLoading.set(true);
		this.jobsService.getJobs().subscribe({
			next: jobs => {
				this.jobs.set(jobs);
				this.isLoading.set(false);
			},
			error: () => this.isLoading.set(false)
		});
	}
}
