import { NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	inject,
	input,
	output
} from "@angular/core";

import { ViewportService } from "../../../../core/services/viewport";
import { FilterSection } from "../../../../shared/components/filter-section/filter-section";
import {
	UiBottomSheet,
	UiButton,
	UiDrawer,
	UiSwitch
} from "../../../../shared/ui";
import { STAT_GROUPS, STAT_LABELS, type StatKey } from "../../saved-filters";

@Component({
	selector: "app-saved-view-stats-panel",
	imports: [
		FilterSection,
		NgTemplateOutlet,
		UiBottomSheet,
		UiButton,
		UiDrawer,
		UiSwitch
	],
	templateUrl: "./saved-view-stats-panel.html",
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SavedViewStatsPanel {
	protected readonly isMobile = inject(ViewportService).isMobile;
	protected readonly statGroups = STAT_GROUPS;
	protected readonly statLabels = STAT_LABELS;

	readonly viewName = input<string | null>(null);
	readonly enabledStats = input.required<ReadonlySet<StatKey>>();
	readonly saving = input(false);
	readonly custom = input(false);

	readonly statToggle = output<StatKey>();
	readonly resetRequested = output<void>();
	readonly closed = output<void>();
}
