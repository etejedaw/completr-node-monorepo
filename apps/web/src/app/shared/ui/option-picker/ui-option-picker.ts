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
import { UiBottomSheet } from "../bottom-sheet/ui-bottom-sheet";
import { UiEyebrow } from "../label/ui-eyebrow";
import { compactPickerTriggerClass } from "./ui-compact-picker-trigger";
import {
	type UiPickerAction,
	type UiPickerOption,
	type UiPickerTriggerSize
} from "./ui-option-picker.model";

@Component({
	selector: "ui-option-picker",
	imports: [
		UiEyebrow,
		NgTemplateOutlet,
		RouterLink,
		NgpMenu,
		NgpMenuItem,
		NgpMenuItemRadio,
		NgpMenuItemRadioGroup,
		NgpMenuTrigger,
		UiBottomSheet
	],
	templateUrl: "./ui-option-picker.html",
	host: { class: "block min-w-0" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiOptionPicker {
	readonly label = input.required<string>();
	readonly heading = input.required<string>();
	readonly options = input.required<readonly UiPickerOption[]>();
	readonly value = model<string>("");
	readonly actions = input<readonly UiPickerAction[]>([]);
	readonly variant = input<"field" | "compact" | "input">("field");
	readonly triggerId = input<string | null>(null);
	readonly size = input<UiPickerTriggerSize>("sm");
	readonly placeholder = input("None");
	readonly placeholderIcon = input("tune");
	readonly invalid = input(false);
	readonly describedBy = input<string | null>(null);
	readonly modified = input(false);
	readonly actionSelected = output<string>();
	readonly lockedSelected = output<UiPickerOption>();

	protected readonly isMobile = inject(ViewportService).isMobile;
	protected readonly compactTriggerClass = compactPickerTriggerClass;
	protected readonly sheetOpen = signal(false);
	private readonly menuTrigger = viewChild(NgpMenuTrigger);

	protected readonly triggerLabel = computed(() => {
		const current = this.selected();
		const name = `${this.label()}: ${current?.label ?? this.placeholder()}`;
		return this.showsModified() ? `${name} (modified)` : name;
	});

	protected readonly showsModified = computed(
		() => this.modified() && this.selected() !== null
	);

	protected readonly selected = computed(
		() =>
			this.options().find(option => option.value === this.value()) ?? null
	);

	protected openSheet() {
		if (this.isMobile()) this.sheetOpen.set(true);
	}

	protected choose(option: UiPickerOption) {
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
