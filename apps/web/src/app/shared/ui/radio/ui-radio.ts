import { Directive } from "@angular/core";
import {
	NgpRadioGroup,
	NgpRadioIndicator,
	NgpRadioItem
} from "ng-primitives/radio";

/**
 * Radio group container. Provides roving-focus arrow key navigation across
 * items. Use with `formControlName` / `[(ngModel)]` like a normal group.
 *
 *   <div uiRadioGroup formControlName="scoreSource">
 *     <button uiRadioItem ngpRadioItemValue="metacritic">Metacritic</button>
 *     <button uiRadioItem ngpRadioItemValue="opencritic">OpenCritic</button>
 *   </div>
 */
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
