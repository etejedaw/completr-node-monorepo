import { Directive } from "@angular/core";
import { NgpInput } from "ng-primitives/input";

@Directive({
	selector: "input[uiInput], textarea[uiInput]",
	hostDirectives: [{ directive: NgpInput, inputs: ["disabled"] }],
	host: {
		class: "ui-input"
	}
})
export class UiInput {}
