import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { injectDialogRef } from "ng-primitives/dialog";

import { type BacklogEntry } from "../../../../core/models";
import { BacklogStatusBadge } from "../../../../shared/components/backlog-status-badge/backlog-status-badge";
import { UiButton, UiDialog, UiEyebrow } from "../../../../shared/ui";
import { type GameQueueRunPickerData } from "./game-queue-run-picker.model";

export type GameQueueRunPickerResult = BacklogEntry | "newRun";

@Component({
	selector: "app-game-queue-run-picker",
	imports: [DatePipe, UiButton, UiDialog, UiEyebrow, BacklogStatusBadge],
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
