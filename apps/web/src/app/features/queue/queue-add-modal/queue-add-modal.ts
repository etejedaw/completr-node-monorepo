import {
	ChangeDetectionStrategy,
	Component,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import {
	injectDialogRef,
	NgpDialog,
	NgpDialogOverlay,
	NgpDialogTitle
} from "ng-primitives/dialog";

import { type BacklogEntry, type BacklogStatus } from "../../../core/models";
import { UiButton, UiIconButton } from "../../../shared/ui";
import {
	backlogStatusClass,
	backlogStatusLabel
} from "../../../shared/utils/backlog-status";
import { BacklogService } from "../../backlog/backlog";
import { QueueService } from "../queue";

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

	protected statusLabel = (status?: string) =>
		status ? backlogStatusLabel(status as BacklogStatus) : "";

	protected statusClass = (status?: string) =>
		status ? backlogStatusClass(status as BacklogStatus) : "";
}
