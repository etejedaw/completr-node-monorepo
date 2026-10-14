import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";

import { type BacklogEntry } from "../../../../core/models";
import { type BacklogStatusOption } from "../../../../shared/components/backlog-entry-card/backlog-entry-card";
import { UiBottomSheet } from "../../../../shared/ui";
import {
	backlogStatusIcon,
	backlogStatusIconColor
} from "../../../../shared/utils/backlog-status";

export interface EntryStatusSelection {
	status: string;
	event: Event;
}

@Component({
	selector: "app-entry-status-sheet",
	imports: [UiBottomSheet],
	templateUrl: "./entry-status-sheet.html",
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntryStatusSheet {
	protected readonly statusIcon = backlogStatusIcon;
	protected readonly statusIconColor = backlogStatusIconColor;

	readonly entry = input.required<BacklogEntry>();
	readonly statusOptions = input<readonly BacklogStatusOption[]>([]);
	readonly updating = input(false);

	readonly statusSelected = output<EntryStatusSelection>();
	readonly closed = output<void>();
}
