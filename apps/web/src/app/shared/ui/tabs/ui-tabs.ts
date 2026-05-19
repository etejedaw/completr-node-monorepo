import { ChangeDetectionStrategy, Component, Directive, input, model } from "@angular/core";
import {
	NgpTabButton,
	NgpTabList,
	NgpTabPanel,
	NgpTabset
} from "ng-primitives/tabs";

@Component({
	selector: "ui-tabs",
	imports: [NgpTabset],
	template: `
		<div
			ngpTabset
			[(ngpTabsetValue)]="value"
			[ngpTabsetOrientation]="orientation()"
		>
			<ng-content />
		</div>
	`,
	host: { class: "ui-tabs" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiTabs {
	value = model<string>("");
	orientation = input<"horizontal" | "vertical">("horizontal");
}

@Directive({
	selector: "ui-tab-list, [uiTabList]",
	hostDirectives: [NgpTabList],
	host: { class: "ui-tab-list" }
})
export class UiTabList {}

@Directive({
	selector: "button[uiTab]",
	hostDirectives: [{ directive: NgpTabButton, inputs: ["ngpTabButtonValue: value", "ngpTabButtonDisabled: disabled"] }],
	host: { class: "ui-tab" }
})
export class UiTab {}

@Directive({
	selector: "[uiTabPanel]",
	hostDirectives: [{ directive: NgpTabPanel, inputs: ["ngpTabPanelValue: value"] }],
	host: { class: "ui-tab-panel" }
})
export class UiTabPanel {}
