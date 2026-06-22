import { Directive, input } from "@angular/core";
import { NgpInput } from "ng-primitives/input";

export type UiInputSize = "sm" | "md";

@Directive({
	selector: "input[uiInput], textarea[uiInput]",
	hostDirectives: [{ directive: NgpInput, inputs: ["disabled"] }],
	host: {
		class: "ui-input",
		"[attr.data-size]": "size()"
	}
})
export class UiInput {
	readonly size = input<UiInputSize>("md");
}
