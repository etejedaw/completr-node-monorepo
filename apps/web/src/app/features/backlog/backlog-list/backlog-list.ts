import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { BacklogEntry, BacklogStatus } from "../../../core/models";
import { BacklogService, BacklogFilters } from "../backlog.service";

@Component({
	selector: "app-backlog-list",
	imports: [],
	templateUrl: "./backlog-list.html",
	styleUrl: "./backlog-list.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogList implements OnInit {
	private readonly backlogService = inject(BacklogService);

	protected readonly entries = signal<BacklogEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly isInitialLoad = signal(true);
	protected readonly activeStatus = signal<string>("");
	protected readonly sortBy = signal("createdAt");
	protected readonly sortOrder = signal<"asc" | "desc">("desc");

	private readonly statuses: { label: string; value: string }[] = [
		{ label: "All", value: "" },
		{ label: "Not Started", value: "not_started" },
		{ label: "Playing", value: "playing" },
		{ label: "Completed", value: "completed" },
		{ label: "Abandoned", value: "abandoned" }
	];

	protected readonly statusFilters = this.statuses;

	ngOnInit() {
		this.loadBacklog();
	}

	filterByStatus(status: string) {
		this.activeStatus.set(status);
		this.loadBacklog();
	}

	sort(column: string) {
		if (this.sortBy() === column) {
			this.sortOrder.set(this.sortOrder() === "asc" ? "desc" : "asc");
		} else {
			this.sortBy.set(column);
			this.sortOrder.set("desc");
		}
		this.loadBacklog();
	}

	statusClass(status: BacklogStatus): string {
		const map: Record<BacklogStatus, string> = {
			not_started: "status-not-started",
			playing: "status-playing",
			completed: "status-completed",
			abandoned: "status-abandoned"
		};
		return map[status] ?? "";
	}

	statusLabel(status: BacklogStatus): string {
		const map: Record<BacklogStatus, string> = {
			not_started: "Not Started",
			playing: "Playing",
			completed: "Completed",
			abandoned: "Abandoned"
		};
		return map[status] ?? status;
	}

	private loadBacklog() {
		this.isLoading.set(true);
		const filters: BacklogFilters = {
			sort_by: this.sortBy(),
			sort_order: this.sortOrder()
		};

		if (this.activeStatus()) {
			filters.status = this.activeStatus();
		}

		this.backlogService.getMyBacklog(filters).subscribe({
			next: res => {
				this.entries.set(res.data.backlog);
				this.isLoading.set(false);
				this.isInitialLoad.set(false);
			},
			error: () => {
				this.isLoading.set(false);
				this.isInitialLoad.set(false);
			}
		});
	}
}
