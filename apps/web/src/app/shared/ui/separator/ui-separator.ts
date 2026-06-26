import { Directive } from "@angular/core";
import { NgpSeparator } from "ng-primitives/separator";

@Directive({
	selector: "[uiSeparator]",
	hostDirectives: [
		{
			directive: NgpSeparator,
			inputs: ["ngpSeparatorOrientation: orientation"]
		}
	]
})
export class UiSeparator {}
