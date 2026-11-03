import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { NgpButton } from "ng-primitives/button";

export type UiIconButtonSize = "xs" | "sm" | "md" | "lg";
export type UiIconButtonTone = "neutral" | "accent" | "danger";
export type UiIconButtonShape = "rounded" | "circle";
export type UiIconButtonVariant = "plain" | "glass";

@Component({
	selector: "button[uiIconButton], a[uiIconButton]",
	template: "<ng-content />",
	changeDetection: ChangeDetectionStrategy.OnPush,
	hostDirectives: [{ directive: NgpButton, inputs: ["disabled"] }],
	host: {
		class: "ui-icon-button",
		"[attr.data-size]": "size()",
		"[attr.data-tone]": "tone()",
		"[attr.data-shape]": "shape()",
		"[attr.data-variant]": "variant()"
	}
})
export class UiIconButton {
	size = input<UiIconButtonSize>("md");
	tone = input<UiIconButtonTone>("neutral");
	shape = input<UiIconButtonShape>("rounded");
	variant = input<UiIconButtonVariant>("plain");
}
