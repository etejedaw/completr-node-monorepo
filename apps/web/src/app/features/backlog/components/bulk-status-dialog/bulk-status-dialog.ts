import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
	signal
} from "@angular/core";

import { type BacklogStatus } from "../../../../core/models";
import { BacklogStatusPicker } from "../../../../shared/components/backlog-status-picker/backlog-status-picker";
import {
	UiAlert,
	UiButton,
	UiDatePicker,
	UiDialog,
	UiFieldLabel
} from "../../../../shared/ui";
import {
	backlogStatusIcon,
	backlogStatusLabel
} from "../../../../shared/utils/backlog-status";
import { countOf } from "../../../../shared/utils/bulk-feedback";
import { todayLocalDate } from "../../../../shared/utils/local-date";
import { statusDialogTone } from "../status-change-dialog/status-dialog-tone";
import { type BulkStatusChange } from "./bulk-status-dialog.model";

const RUN_NOUN = { one: "run", other: "runs" };
const FINISHED_RUN_NOUN = { one: "finished run", other: "finished runs" };

const DATE_LABELS: Partial<Record<BacklogStatus, string>> = {
	playing: "Started on",
	completed: "Finished on",
	abandoned: "Abandoned on"
};

@Component({
	selector: "app-bulk-status-dialog",
	imports: [
		BacklogStatusPicker,
		UiAlert,
		UiButton,
		UiDatePicker,
		UiDialog,
		UiFieldLabel
	],
	templateUrl: "./bulk-status-dialog.html",
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BulkStatusDialog {
	readonly eligibleCount = input.required<number>();
	readonly skippedCount = input(0);
	readonly queuedCount = input(0);

	readonly confirmed = output<BulkStatusChange>();
	readonly cancelled = output<void>();

	protected readonly status = signal<BacklogStatus>("completed");
	protected readonly date = signal(todayLocalDate());

	protected readonly statusLabel = computed(() =>
		backlogStatusLabel(this.status())
	);
	protected readonly icon = computed(() => backlogStatusIcon(this.status()));
	protected readonly tone = computed(() => statusDialogTone(this.status()));
	protected readonly dateLabel = computed(
		() => DATE_LABELS[this.status()] ?? null
	);
	protected readonly runsText = computed(() =>
		countOf(this.eligibleCount(), RUN_NOUN)
	);
	protected readonly skippedText = computed(
		() =>
			`${countOf(this.skippedCount(), FINISHED_RUN_NOUN)} will be skipped`
	);
	protected readonly leavesQueue = computed(
		() => this.queuedCount() > 0 && this.status() !== "not_started"
	);

	protected confirm() {
		this.confirmed.emit({ status: this.status(), date: this.date() });
	}
}
