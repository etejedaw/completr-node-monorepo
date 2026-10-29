import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { injectDialogRef } from "ng-primitives/dialog";

import { type BacklogEntry } from "../../../../core/models";
import { UiButton, UiDialog } from "../../../../shared/ui";
import {
	backlogStatusClass,
	backlogStatusIcon,
	backlogStatusLabel
} from "../../../../shared/utils/backlog-status";
import { type GameQueueRunPickerData } from "./game-queue-run-picker.model";

export type GameQueueRunPickerResult = BacklogEntry | "newRun";

@Component({
	selector: "app-game-queue-run-picker",
	imports: [DatePipe, UiButton, UiDialog],
	templateUrl: "./game-queue-run-picker.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameQueueRunPicker {
	private readonly dialogRef = injectDialogRef<
		GameQueueRunPickerData,
		GameQueueRunPickerResult
	>();

	protected readonly gameTitle = this.dialogRef.data.gameTitle;
	protected readonly runs = this.dialogRef.data.runs;

	protected readonly statusClass = backlogStatusClass;
	protected readonly statusIcon = backlogStatusIcon;
	protected readonly statusLabel = backlogStatusLabel;

	protected choose(run: BacklogEntry) {
		this.dialogRef.close(run);
	}

	protected chooseNewRun() {
		this.dialogRef.close("newRun");
	}

	protected close() {
		this.dialogRef.close();
	}
}
