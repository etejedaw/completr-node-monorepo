import { Directive } from "@angular/core";
import {
	NgpRadioGroup,
	NgpRadioIndicator,
	NgpRadioItem
} from "ng-primitives/radio";

@Directive({
	selector: "[uiRadioGroup]",
	hostDirectives: [
		{
			directive: NgpRadioGroup,
			inputs: [
				"id",
				"ngpRadioGroupValue: value",
				"ngpRadioGroupDisabled: disabled",
				"ngpRadioGroupOrientation: orientation"
			],
			outputs: ["ngpRadioGroupValueChange: valueChange"]
		}
	]
})
export class UiRadioGroup {}

@Directive({
	selector: "[uiRadioItem]",
	hostDirectives: [
		{
			directive: NgpRadioItem,
			inputs: [
				"ngpRadioItemValue: value",
				"ngpRadioItemDisabled: disabled"
			]
		}
	]
})
export class UiRadioItem {}

@Directive({
	selector: "[uiRadioIndicator]",
	hostDirectives: [NgpRadioIndicator]
})
export class UiRadioIndicator {}
