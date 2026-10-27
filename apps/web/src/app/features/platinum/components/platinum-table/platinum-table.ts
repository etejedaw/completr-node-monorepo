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

const HEADER_CELL_CLASS =
	"sticky top-0 bg-sidebar/95 backdrop-blur z-[1] text-left px-4 py-3 text-fg-muted font-semibold text-[0.6875rem] uppercase tracking-[0.12em] border-b border-line whitespace-nowrap";

@Component({
	selector: "app-platinum-table",
	imports: [DatePipe, GameTitleCell],
	templateUrl: "./platinum-table.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlatinumTable {
	readonly platinums = input<PlatinumEntry[]>([]);
	readonly selectable = input(false);
	readonly showNotes = input(false);
	readonly selected = output<PlatinumEntry>();

	protected readonly headerCellClass = HEADER_CELL_CLASS;
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
