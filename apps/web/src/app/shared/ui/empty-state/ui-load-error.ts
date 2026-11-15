import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";

import { UiButton } from "../button/ui-button";
import { UiEmptyState } from "./ui-empty-state";

@Component({
	selector: "ui-load-error",
	imports: [UiButton, UiEmptyState],
	template: `
		<div role="alert">
			<ui-empty-state icon="cloud_off" [title]="title()" [hint]="hint()">
				<button
					uiButton
					type="button"
					variant="secondary"
					(click)="retried.emit()"
				>
					{{ retryLabel() }}
				</button>
			</ui-empty-state>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiLoadError {
	readonly title = input("Couldn't load this page");
	readonly hint = input(
		"Something went wrong while fetching your data. Nothing was lost."
	);
	readonly retryLabel = input("Try again");
	readonly retried = output();
}
