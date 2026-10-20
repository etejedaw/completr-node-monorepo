import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";

import { UiButton, UiDialog } from "../../ui";

@Component({
	selector: "app-unfollow-confirm-dialog",
	imports: [UiDialog, UiButton],
	template: `
		<ui-dialog
			size="sm"
			[heading]="'Unfollow @' + username() + '?'"
			[dismissible]="!busy()"
			(closed)="cancelled.emit()"
		>
			<p class="text-sm text-fg-secondary m-0">
				Their activity will stop appearing in your feed. You can follow
				them again later.
			</p>
			<ng-container dialogFooter>
				<button
					uiButton
					variant="ghost"
					type="button"
					[disabled]="busy()"
					(click)="cancelled.emit()"
				>
					Cancel
				</button>
				<button
					uiButton
					variant="danger"
					type="button"
					[disabled]="busy()"
					(click)="confirmed.emit()"
				>
					{{ busy() ? "Unfollowing..." : "Unfollow" }}
				</button>
			</ng-container>
		</ui-dialog>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UnfollowConfirmDialog {
	readonly username = input.required<string>();
	readonly busy = input(false);

	readonly confirmed = output<void>();
	readonly cancelled = output<void>();
}
