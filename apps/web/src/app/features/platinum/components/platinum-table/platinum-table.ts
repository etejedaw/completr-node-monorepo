import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";

import { type PlatinumEntry } from "../../../../core/models";
import { GameTitleCell } from "../../../../shared/components/game-title-cell/game-title-cell";
import { UiBadge, UiIconButton, UiTable } from "../../../../shared/ui";

@Component({
	selector: "app-platinum-table",
	imports: [DatePipe, GameTitleCell, UiBadge, UiIconButton, UiTable],
	templateUrl: "./platinum-table.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlatinumTable {
	readonly platinums = input<PlatinumEntry[]>([]);
	readonly selectable = input(false);
	readonly showNotes = input(false);
	readonly selected = output<PlatinumEntry>();

	protected readonly columns = computed(() => [
		"Title",
		"Platform",
		"Platinumed on",
		...(this.showNotes() ? ["Notes"] : [])
	]);

	protected selectRow(platinum: PlatinumEntry) {
		if (this.selectable()) this.selected.emit(platinum);
	}
}
