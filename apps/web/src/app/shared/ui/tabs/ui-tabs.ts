import { ChangeDetectionStrategy, Component, Directive } from "@angular/core";
import {
	NgpTabButton,
	NgpTabList,
	NgpTabPanel,
	NgpTabset
} from "ng-primitives/tabs";

@Component({
	selector: "ui-tabs",
	template: `<ng-content />`,
	hostDirectives: [
		{
			directive: NgpTabset,
			inputs: [
				"ngpTabsetValue: value",
				"ngpTabsetOrientation: orientation",
				"ngpTabsetActivateOnFocus: activateOnFocus"
			],
			outputs: ["ngpTabsetValueChange: valueChange"]
		}
	],
	host: { class: "ui-tabs" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiTabs {}

@Directive({
	selector: "ui-tab-list, [uiTabList]",
	hostDirectives: [NgpTabList],
	host: { class: "ui-tab-list" }
})
export class UiTabList {}

@Directive({
	selector: "button[uiTab]",
	hostDirectives: [
		{
			directive: NgpTabButton,
			inputs: [
				"ngpTabButtonValue: value",
				"ngpTabButtonDisabled: disabled"
			]
		}
	],
	host: { class: "ui-tab" }
})
export class UiTab {}

@Directive({
	selector: "[uiTabPanel]",
	hostDirectives: [
		{ directive: NgpTabPanel, inputs: ["ngpTabPanelValue: value"] }
	],
	host: { class: "ui-tab-panel" }
})
export class UiTabPanel {}
