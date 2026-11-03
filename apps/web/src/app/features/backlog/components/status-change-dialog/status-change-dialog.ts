import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";

import { type BacklogStatus } from "../../../../core/models";
import { PlatinumTrophy } from "../../../../shared/components/platinum-trophy/platinum-trophy";
import { StarRating } from "../../../../shared/components/star-rating/star-rating";
import {
	UiButton,
	UiDatePicker,
	UiDialog,
	type UiDialogTone,
	UiFieldLabel,
	UiFieldOptional,
	UiInput,
	UiSwitch,
	UiTextarea
} from "../../../../shared/ui";
import {
	backlogStatusIcon,
	backlogStatusLabel
} from "../../../../shared/utils/backlog-status";
import { type PendingStatusUpdate } from "./status-change-dialog.model";

const STATUS_DIALOG_TONES: Partial<Record<BacklogStatus, UiDialogTone>> = {
	completed: "success",
	abandoned: "danger"
};

@Component({
	selector: "app-status-change-dialog",
	imports: [
		DatePipe,
		UiFieldLabel,
		UiFieldOptional,
		PlatinumTrophy,
		StarRating,
		UiButton,
		UiDatePicker,
		UiDialog,
		UiInput,
		UiSwitch,
		UiTextarea
	],
	templateUrl: "./status-change-dialog.html",
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusChangeDialog {
	protected readonly statusLabel = backlogStatusLabel;
	protected readonly statusIcon = backlogStatusIcon;
	protected readonly statusTone = (status: BacklogStatus): UiDialogTone =>
		STATUS_DIALOG_TONES[status] ?? "brand";

	readonly pendingUpdate = input.required<PendingStatusUpdate>();
	readonly inQueue = input(false);

	readonly edited = output<Partial<PendingStatusUpdate>>();
	readonly confirmed = output<void>();
	readonly cancelled = output<void>();
	readonly reviewRequested = output<void>();

	protected updatePendingStatus(patch: Partial<PendingStatusUpdate>) {
		this.edited.emit(patch);
	}
}
