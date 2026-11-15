import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { type Subscription } from "rxjs";

import { ToastService } from "../../../core/services/toast";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import {
	UiActionMenu,
	type UiActionMenuItem,
	UiBadge,
	UiButton,
	UiEmptyState,
	UiEyebrow,
	UiSkeleton,
	UiTable
} from "../../../shared/ui";
import { type JobEntry } from "../services/jobs.model";
import { JobsService } from "../services/jobs.service";
import { type JobAction, type JobStatusStyle } from "./admin-jobs.model";

const POPULATE_RAWG_BATCH_SIZE = 2;
const NOT_FOUND_STATUS = 404;

const JOB_ACTIONS: JobAction[] = [
	{ type: "populate_rawg", label: "Populate RAWG IDs", icon: "cloud_sync" },
	{
		type: "populate_external_data",
		label: "Fill missing Metacritic & HLTB",
		icon: "travel_explore"
	},
	{ type: "calculate_ratings", label: "Calculate Ratings", icon: "star" },
	{
		type: "calculate_durations",
		label: "Calculate Durations",
		icon: "schedule"
	}
];

const JOB_STATUS_STYLES: Record<string, JobStatusStyle> = {
	running: { icon: "autorenew", tone: "warning" },
	completed: { icon: "check_circle", tone: "success" },
	failed: { icon: "error_outline", tone: "danger" }
};

const DEFAULT_JOB_STATUS_STYLE: JobStatusStyle = {
	icon: "remove_circle_outline",
	tone: "neutral"
};

@Component({
	selector: "app-admin-jobs",
	imports: [
		UiActionMenu,
		DatePipe,
		LibraryHero,
		UiBadge,
		UiButton,
		UiEmptyState,
		UiEyebrow,
		UiSkeleton,
		UiTable
	],
	templateUrl: "./admin-jobs.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminJobs implements OnInit {
	private readonly jobsService = inject(JobsService);
	private readonly toast = inject(ToastService);
	private readonly destroyRef = inject(DestroyRef);
	private loadRequest?: Subscription;

	protected readonly jobs = signal<JobEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly starting = signal("");
	protected readonly cancelling = signal("");
	protected readonly loadFailed = signal(false);
	protected readonly jobMenuItems = computed<UiActionMenuItem[]>(() =>
		JOB_ACTIONS.map(action => ({
			id: action.type,
			label: action.label,
			icon: action.icon,
			busy: this.starting() === action.type,
			disabled: !!this.starting()
		}))
	);
	protected readonly skeletonRows = [1, 2, 3, 4];

	ngOnInit() {
		this.destroyRef.onDestroy(() => this.loadRequest?.unsubscribe());
		this.loadJobs();
	}

	startJob(type: string) {
		if (this.starting()) return;
		this.starting.set(type);
		const actions: Partial<
			Record<
				string,
				() => ReturnType<typeof this.jobsService.startPopulateRawg>
			>
		> = {
			populate_rawg: () =>
				this.jobsService.startPopulateRawg(POPULATE_RAWG_BATCH_SIZE),
			populate_external_data: () =>
				this.jobsService.startPopulateExternalData(),
			calculate_ratings: () => this.jobsService.startCalculateRatings(),
			calculate_durations: () =>
				this.jobsService.startCalculateDurations()
		};

		const action = actions[type];
		if (!action) {
			this.starting.set("");
			return;
		}

		action()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
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
		this.jobsService
			.cancelJob(jobId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.cancelling.set("");
					this.loadJobs();
				},
				error: err => {
					this.cancelling.set("");
					this.toast.warning(
						"Couldn't cancel the job. It may have already finished."
					);
					if (err.status === NOT_FOUND_STATUS) this.loadJobs();
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
