import { Directive } from "@angular/core";
import { NgpTooltip } from "ng-primitives/tooltip";

@Directive({
	selector: "[uiTooltipContent]",
	hostDirectives: [NgpTooltip],
	host: { class: "ui-tooltip" }
})
export class UiTooltipContent {}
