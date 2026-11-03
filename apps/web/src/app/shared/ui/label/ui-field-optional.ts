import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
	selector: "ui-field-optional",
	template: `Optional`,
	host: { class: "text-xs font-normal text-fg-muted" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiFieldOptional {}
