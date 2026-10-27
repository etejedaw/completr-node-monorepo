import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";

import { type PlatinumEntry } from "../../../../core/models";
import { CoverGrid } from "../../../../shared/components/cover-grid/cover-grid";
import { PlatinumCoverCard } from "../../../../shared/components/platinum-cover-card/platinum-cover-card";
import { type ViewModeOption } from "../../../../shared/components/view-mode-toggle/view-mode-toggle";
import { PlatinumCalendar } from "../platinum-calendar/platinum-calendar";
import { PlatinumTable } from "../platinum-table/platinum-table";

export type PlatinumViewMode = "grid" | "hardcore" | "calendar";

export const PLATINUM_VIEW_MODES: readonly ViewModeOption<PlatinumViewMode>[] =
	[
		{ value: "grid", label: "Grid", icon: "grid_view" },
		{ value: "hardcore", label: "Hardcore", icon: "table_rows" },
		{ value: "calendar", label: "Calendar", icon: "calendar_month" }
	];

export function readStoredPlatinumViewMode(
	storageKey: string
): PlatinumViewMode {
	const saved = localStorage.getItem(storageKey);
	return saved === "hardcore" || saved === "calendar" ? saved : "grid";
}

@Component({
	selector: "app-platinum-collection",
	imports: [CoverGrid, PlatinumCalendar, PlatinumCoverCard, PlatinumTable],
	template: `
		@switch (viewMode()) {
			@case ("calendar") {
				<app-platinum-calendar
					[platinums]="platinums()"
					[emptyMonthHint]="emptyMonthHint()"
					(platinumClick)="selected.emit($event)"
				/>
			}
			@case ("hardcore") {
				<app-platinum-table
					[platinums]="platinums()"
					[selectable]="selectable()"
					[showNotes]="showNotes()"
					(selected)="selected.emit($event)"
				/>
			}
			@default {
				<app-cover-grid>
					@for (platinum of platinums(); track platinum.id) {
						<li>
							<app-platinum-cover-card
								[platinum]="platinum"
								[selectable]="selectable()"
								(selected)="selected.emit($event)"
							/>
						</li>
					}
				</app-cover-grid>
			}
		}
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlatinumCollection {
	readonly platinums = input<PlatinumEntry[]>([]);
	readonly viewMode = input<PlatinumViewMode>("grid");
	readonly selectable = input(false);
	readonly showNotes = input(false);
	readonly emptyMonthHint = input("No platinums this month.");
	readonly selected = output<PlatinumEntry>();
}
