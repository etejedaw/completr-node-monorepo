import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { type Subscription } from "rxjs";

import { ToastService } from "../../../core/services/toast";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../../shared/components/library-toolbar/library-toolbar";
import { UiButton, UiEmptyState, UiSkeleton } from "../../../shared/ui";
import { type JobEntry } from "../services/jobs.model";
import { JobsService } from "../services/jobs.service";
import { type JobAction, type JobStatusStyle } from "./admin-jobs.model";

const JOB_ACTIONS: JobAction[] = [
	{ type: "populate_rawg", label: "Populate RAWG IDs", icon: "cloud_sync" },
	{ type: "calculate_ratings", label: "Calculate Ratings", icon: "star" },
	{
		type: "calculate_durations",
		label: "Calculate Durations",
		icon: "schedule"
	}
];

const JOB_STATUS_STYLES: Record<string, JobStatusStyle> = {
	running: { icon: "autorenew", classes: "bg-warning/10 text-warning" },
	completed: { icon: "check_circle", classes: "bg-success/10 text-success" },
	failed: { icon: "error_outline", classes: "bg-danger/10 text-danger" }
};

const DEFAULT_JOB_STATUS_STYLE: JobStatusStyle = {
	icon: "remove_circle_outline",
	classes: "bg-fg-muted/10 text-fg-muted"
};

@Component({
	selector: "app-admin-jobs",
	imports: [
		DatePipe,
		LibraryHero,
		LibraryToolbar,
		UiButton,
		UiEmptyState,
		UiSkeleton
	],
	templateUrl: "./admin-jobs.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminJobs implements OnInit {
	private readonly jobsService = inject(JobsService);
	private readonly toast = inject(ToastService);
	private loadRequest?: Subscription;

	protected readonly jobs = signal<JobEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly starting = signal("");
	protected readonly cancelling = signal("");
	protected readonly loadFailed = signal(false);
	protected readonly jobActions = JOB_ACTIONS;
	protected readonly skeletonRows = [1, 2, 3, 4];

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
		if (this.cancelling()) return;
		this.cancelling.set(jobId);
		this.jobsService.cancelJob(jobId).subscribe({
			next: () => {
				this.cancelling.set("");
				this.loadJobs();
			},
			error: () => {
				this.cancelling.set("");
				this.toast.warning(
					"Couldn't cancel the job. It may have already finished."
				);
			}
		});
	}

	refresh() {
		this.loadJobs();
	}

	protected statusStyle(status: string) {
		return JOB_STATUS_STYLES[status] ?? DEFAULT_JOB_STATUS_STYLE;
	}

	private loadJobs() {
		this.loadRequest?.unsubscribe();
		this.isLoading.set(true);
		this.loadFailed.set(false);
		this.loadRequest = this.jobsService.getJobs().subscribe({
			next: jobs => {
				this.jobs.set(jobs);
				this.isLoading.set(false);
			},
			error: () => {
				this.loadFailed.set(true);
				this.isLoading.set(false);
			}
		});
	}
}
