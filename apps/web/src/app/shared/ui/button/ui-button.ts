import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { NgpButton } from "ng-primitives/button";

export type UiButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type UiButtonSize = "sm" | "md" | "lg";

@Component({
	selector: "button[uiButton], a[uiButton]",
	template: "<ng-content />",
	changeDetection: ChangeDetectionStrategy.OnPush,
	hostDirectives: [{ directive: NgpButton, inputs: ["disabled"] }],
	host: {
		class: "ui-button",
		"[attr.data-variant]": "variant()",
		"[attr.data-size]": "size()",
		"[attr.data-block]": "block() ? '' : null"
	}
})
export class UiButton {
	variant = input<UiButtonVariant>("primary");
	size = input<UiButtonSize>("md");
	block = input(false);
}
