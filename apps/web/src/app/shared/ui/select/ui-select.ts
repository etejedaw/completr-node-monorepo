import { Directive, input } from "@angular/core";
import { NgpNativeSelect } from "ng-primitives/select";
import type { UiInputSize } from "../input/ui-input";

/**
 * Style + a11y wrapper over a native `<select>`. Reuses `.ui-input` so the
 * trigger matches inputs visually, and adds `NgpNativeSelect` for state.
 *
 *   <select uiSelect formControlName="role">…</select>
 */
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
