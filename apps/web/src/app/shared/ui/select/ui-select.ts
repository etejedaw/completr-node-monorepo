import { Directive, input } from "@angular/core";
import { NgpNativeSelect } from "ng-primitives/select";

import type { UiInputSize } from "../input/ui-input";

@Directive({
	selector: "select[uiSelect]",
	hostDirectives: [
		{
			directive: NgpNativeSelect,
			inputs: ["id", "ngpNativeSelectDisabled: disabled"]
		}
	],
	host: {
		class: "ui-input ui-select",
		"[attr.data-size]": "size()"
	}
})
export class UiSelect {
	readonly size = input<UiInputSize>("md");
}
