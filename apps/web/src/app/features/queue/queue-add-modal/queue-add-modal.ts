import {
	ChangeDetectionStrategy,
	Component,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { injectDialogRef } from "ng-primitives/dialog";

import { type BacklogEntry } from "../../../core/models";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import {
	UiButton,
	UiDialog,
	UiPlainEmptyState,
	UiSearchBar
} from "../../../shared/ui";
import {
	backlogStatusClass,
	backlogStatusIcon,
	backlogStatusLabel
} from "../../../shared/utils/backlog-status";
import { BacklogService } from "../../backlog/backlog";
import { QueueService } from "../queue";
import { type QueueAddModalData } from "./queue-add-modal.model";

@Component({
	selector: "app-queue-add-modal",
	imports: [GamePoster, UiButton, UiDialog, UiPlainEmptyState, UiSearchBar],
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
	protected readonly announcement = signal("");
	protected readonly skeletonRows = [1, 2, 3, 4, 5];

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

	addToQueue(entry: BacklogEntry) {
		if (this.adding()) return;
		this.adding.set(entry.id);
		this.queueService.addFromBacklog(entry.id).subscribe({
			next: () => {
				this.adding.set(null);
				this.announcement.set(`${entry.game.title} added to Up Next`);
				this.entries.set(this.entries().filter(e => e.id !== entry.id));
				this.dialogRef.data.onAdded();
			},
			error: () => this.adding.set(null)
		});
	}

	onClose() {
		this.dialogRef.close();
	}

	protected readonly backlogStatusLabel = backlogStatusLabel;
	protected readonly backlogStatusIcon = backlogStatusIcon;
	protected readonly backlogStatusClass = backlogStatusClass;
}
