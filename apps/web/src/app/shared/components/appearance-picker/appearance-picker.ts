import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	model
} from "@angular/core";

import {
	APPEARANCE_COLORS,
	APPEARANCE_ICONS
} from "../../constants/appearance";
import { UiFieldLabel, UiFieldOptional, UiSwatchButton } from "../../ui";
import {
	appearanceColorHex,
	appearanceIconLabel
} from "../../utils/appearance";

@Component({
	selector: "app-appearance-picker",
	imports: [UiFieldLabel, UiFieldOptional, UiSwatchButton],
	templateUrl: "./appearance-picker.html",
	host: { class: "flex flex-col gap-4" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppearancePicker {
	readonly icon = model<string | null>(null);
	readonly color = model<string | null>(null);
	readonly defaultIcon = input<string | null>(null);

	protected readonly iconOptions = APPEARANCE_ICONS;
	protected readonly colorOptions = APPEARANCE_COLORS;
	protected readonly iconLabel = appearanceIconLabel;
	protected readonly colorHex = computed(() =>
		appearanceColorHex(this.color())
	);
	protected readonly noIconLabel = computed(() =>
		this.defaultIcon() ? "Default icon" : "No icon"
	);
}
