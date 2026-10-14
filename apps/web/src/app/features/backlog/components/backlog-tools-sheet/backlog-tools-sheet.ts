import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";

import { UiBottomSheet } from "../../../../shared/ui";

@Component({
	selector: "app-backlog-tools-sheet",
	imports: [UiBottomSheet],
	templateUrl: "./backlog-tools-sheet.html",
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogToolsSheet {
	readonly viewName = input<string | null>(null);
	readonly hasActiveView = input(false);
	readonly activeFiltersCount = input(0);
	readonly enabledStatsCount = input(0);

	readonly filtersRequested = output<void>();
	readonly statsRequested = output<void>();
	readonly closed = output<void>();
}
