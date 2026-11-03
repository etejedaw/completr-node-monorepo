import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";

import { UiIconButton } from "../../ui";

@Component({
	selector: "app-activity-delete-button",
	imports: [UiIconButton],
	template: `
		<button
			type="button"
			uiIconButton
			shape="circle"
			tone="danger"
			class="-mr-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100 pointer-coarse:opacity-100"
			aria-label="Remove this activity"
			[attr.title]="tooltip()"
			(click)="pressed.emit()"
		>
			<span aria-hidden="true" class="material-icons text-base"
				>close</span
			>
		</button>
	`,
	host: { class: "shrink-0 inline-flex" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityDeleteButton {
	readonly tooltip = input("Remove activity");
	readonly pressed = output();
}
