import { NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	model,
	output,
	signal,
	viewChild
} from "@angular/core";
import { RouterLink } from "@angular/router";
import {
	NgpMenu,
	NgpMenuItem,
	NgpMenuItemRadio,
	NgpMenuItemRadioGroup,
	NgpMenuTrigger
} from "ng-primitives/menu";

import { ViewportService } from "../../../core/services/viewport";
import { UiBottomSheet } from "../../ui";

export interface PickerOption {
	value: string;
	label: string;
	icon?: string;
	iconClass?: string;
	iconColor?: string | null;
	count?: number | null;
	hint?: string;
	locked?: boolean;
	link?: string;
	fragment?: string;
}

export interface PickerAction {
	id: string;
	label: string;
	icon: string;
}

@Component({
	selector: "app-option-picker",
	imports: [
		NgTemplateOutlet,
		RouterLink,
		NgpMenu,
		NgpMenuItem,
		NgpMenuItemRadio,
		NgpMenuItemRadioGroup,
		NgpMenuTrigger,
		UiBottomSheet
	],
	templateUrl: "./option-picker.html",
	host: { class: "block min-w-0" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class OptionPicker {
	readonly label = input.required<string>();
	readonly heading = input.required<string>();
	readonly options = input.required<readonly PickerOption[]>();
	readonly value = model<string>("");
	readonly actions = input<readonly PickerAction[]>([]);
	readonly variant = input<"field" | "compact">("field");
	readonly size = input<"sm" | "md">("sm");
	readonly placeholder = input("None");
	readonly placeholderIcon = input("tune");
	readonly invalid = input(false);
	readonly describedBy = input<string | null>(null);
	readonly actionSelected = output<string>();
	readonly lockedSelected = output<PickerOption>();

	protected readonly isMobile = inject(ViewportService).isMobile;
	protected readonly sheetOpen = signal(false);
	private readonly menuTrigger = viewChild(NgpMenuTrigger);

	protected readonly selected = computed(
		() =>
			this.options().find(option => option.value === this.value()) ?? null
	);

	protected openSheet() {
		if (this.isMobile()) this.sheetOpen.set(true);
	}

	protected choose(option: PickerOption) {
		this.sheetOpen.set(false);
		if (option.locked) {
			this.lockedSelected.emit(option);
			return;
		}
		this.value.set(option.value);
	}

	protected chooseValue(value: string) {
		this.menuTrigger()?.hide("keyboard");
		const option = this.options().find(item => item.value === value);
		if (option) this.choose(option);
	}

	protected runAction(id: string) {
		this.sheetOpen.set(false);
		this.actionSelected.emit(id);
	}
}
