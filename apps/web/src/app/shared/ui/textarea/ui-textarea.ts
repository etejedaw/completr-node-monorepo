import { Directive, input } from "@angular/core";
import { NgpTextarea } from "ng-primitives/textarea";

import type { UiInputSize } from "../input/ui-input";

@Directive({
	selector: "textarea[uiTextarea]",
	hostDirectives: [{ directive: NgpTextarea, inputs: ["disabled"] }],
	host: {
		class: "ui-input",
		"[attr.data-size]": "size()"
	}
})
export class UiTextarea {
	readonly size = input<UiInputSize>("md");
}
