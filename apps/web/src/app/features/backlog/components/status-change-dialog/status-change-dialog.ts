import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";

import { PlatinumTrophy } from "../../../../shared/components/platinum-trophy/platinum-trophy";
import { StarRating } from "../../../../shared/components/star-rating/star-rating";
import {
	UiButton,
	UiDialog,
	UiFieldLabel,
	UiInput,
	UiSwitch,
	UiTextarea
} from "../../../../shared/ui";
import {
	backlogStatusIcon,
	backlogStatusIconColor,
	backlogStatusLabel
} from "../../../../shared/utils/backlog-status";
import { type PendingStatusUpdate } from "./status-change-dialog.model";

@Component({
	selector: "app-status-change-dialog",
	imports: [
		DatePipe,
		UiFieldLabel,
		PlatinumTrophy,
		StarRating,
		UiButton,
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
	protected readonly statusIconColor = backlogStatusIconColor;

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
