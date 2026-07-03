import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import {
	NgpDialog,
	NgpDialogOverlay,
	NgpDialogTitle,
	injectDialogRef
} from "ng-primitives/dialog";
import { BacklogEntry } from "../../../core/models";
import { BacklogService } from "../../backlog/backlog";
import { QueueService } from "../queue";
import { UiButton, UiIconButton } from "../../../shared/ui";

export interface QueueAddModalData {
	onAdded: () => void;
}

@Component({
	selector: "app-queue-add-modal",
	imports: [
		NgpDialog,
		NgpDialogOverlay,
		NgpDialogTitle,
		UiButton,
		UiIconButton
	],
	templateUrl: "./queue-add-modal.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class QueueAddModal implements OnInit {
	private readonly backlogService = inject(BacklogService);
	private readonly queueService = inject(QueueService);
	private readonly dialogRef = injectDialogRef<QueueAddModalData>();

	protected readonly entries = signal<BacklogEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly adding = signal<string | null>(null);
	protected readonly searchQuery = signal("");

	ngOnInit() {
		this.backlogService.getMyBacklog({ status: "not_started" }).subscribe({
			next: res => {
				this.entries.set(res.data.backlog);
				this.isLoading.set(false);
			},
			error: () => this.isLoading.set(false)
		});
	}

	protected filteredEntries() {
		const query = this.searchQuery().toLowerCase();
		if (!query) return this.entries();
		return this.entries().filter(e =>
			e.game.title.toLowerCase().includes(query)
		);
	}

	onSearch(event: Event) {
		this.searchQuery.set((event.target as HTMLInputElement).value);
	}

	addToQueue(entry: BacklogEntry) {
		if (this.adding()) return;
		this.adding.set(entry.id);
		this.queueService.addFromBacklog(entry.id).subscribe({
			next: () => {
				this.adding.set(null);
				this.entries.set(this.entries().filter(e => e.id !== entry.id));
				this.dialogRef.data.onAdded();
			},
			error: () => this.adding.set(null)
		});
	}

	onClose() {
		this.dialogRef.close();
	}

	statusLabel(status?: string): string {
		const map: Record<string, string> = {
			not_started: "Not Started",
			playing: "Playing",
			completed: "Completed",
			abandoned: "Abandoned"
		};
		return status ? (map[status] ?? status) : "";
	}

	statusClass(status?: string): string {
		const map: Record<string, string> = {
			not_started: "bg-fg-muted/10 text-fg-muted",
			playing: "bg-warning/10 text-warning",
			completed: "bg-success/10 text-success",
			abandoned: "bg-danger/10 text-danger"
		};
		return status ? (map[status] ?? "") : "";
	}
}
