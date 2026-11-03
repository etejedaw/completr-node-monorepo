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
import { SelectionCell } from "../../../../shared/directives/selection-cell";
import { type SelectionToggle } from "../../../../shared/directives/selection-cell.model";
import {
	UiBadge,
	UiCheckbox,
	UiIconButton,
	UiTable
} from "../../../../shared/ui";
import { type RowSelection } from "../../../../shared/utils/row-selection.model";

@Component({
	selector: "app-platinum-table",
	imports: [
		DatePipe,
		GameTitleCell,
		SelectionCell,
		UiBadge,
		UiCheckbox,
		UiIconButton,
		UiTable
	],
	templateUrl: "./platinum-table.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlatinumTable {
	readonly platinums = input<PlatinumEntry[]>([]);
	readonly selectable = input(false);
	readonly showNotes = input(false);
	readonly selection = input<RowSelection<PlatinumEntry> | null>(null);
	readonly selected = output<PlatinumEntry>();

	protected readonly activeSelection = computed(() =>
		this.selectable() ? this.selection() : null
	);

	protected readonly columns = computed(() => [
		"Title",
		"Platform",
		"Platinumed on",
		...(this.showNotes() ? ["Notes"] : [])
	]);

	protected ariaSelected(platinum: PlatinumEntry): boolean | null {
		return this.activeSelection()?.isSelected(platinum.id) ?? null;
	}

	protected toggleSelection(
		platinum: PlatinumEntry,
		toggle: SelectionToggle
	) {
		const selection = this.activeSelection();
		if (!selection) return;
		if (toggle.range) selection.toggleRange(platinum.id);
		else selection.toggle(platinum.id);
	}

	protected selectRow(platinum: PlatinumEntry) {
		if (this.selectable()) this.selected.emit(platinum);
	}
}
