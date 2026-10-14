import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";

import { UiButton } from "../button/ui-button";
import { UiEmptyState } from "./ui-empty-state";

@Component({
	selector: "ui-no-matches",
	imports: [UiButton, UiEmptyState],
	template: `
		<ui-empty-state
			icon="search_off"
			title="No matches found"
			[hint]="hint()"
		>
			<button uiButton variant="secondary" (click)="cleared.emit()">
				{{ clearLabel() }}
			</button>
		</ui-empty-state>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiNoMatches {
	readonly hint = input.required<string>();
	readonly clearLabel = input("Clear search");
	readonly cleared = output();
}
