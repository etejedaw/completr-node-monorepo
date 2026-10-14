import { NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	inject,
	input,
	output
} from "@angular/core";

import { ViewportService } from "../../../../core/services/viewport";
import { UiBottomSheet, UiButton, UiDrawer } from "../../../../shared/ui";
import { STAT_KEYS, STAT_LABELS, type StatKey } from "../../saved-filters";

@Component({
	selector: "app-saved-view-stats-panel",
	imports: [NgTemplateOutlet, UiBottomSheet, UiButton, UiDrawer],
	templateUrl: "./saved-view-stats-panel.html",
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SavedViewStatsPanel {
	protected readonly isMobile = inject(ViewportService).isMobile;
	protected readonly allStatKeys = STAT_KEYS;
	protected readonly statLabels = STAT_LABELS;

	readonly viewName = input<string | null>(null);
	readonly enabledStats = input.required<ReadonlySet<StatKey>>();
	readonly saving = input(false);
	readonly custom = input(false);

	readonly statToggle = output<StatKey>();
	readonly resetRequested = output<void>();
	readonly closed = output<void>();
}
