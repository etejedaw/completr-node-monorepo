import { NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	type ElementRef,
	inject,
	input,
	model,
	signal,
	viewChild
} from "@angular/core";
import { NgpListbox, NgpListboxOption } from "ng-primitives/listbox";
import { NgpPopover, NgpPopoverTrigger } from "ng-primitives/popover";

import { ViewportService } from "../../../core/services/viewport";
import { UiBottomSheet, UiButton, UiInput } from "../../ui";
import { type PickerOption } from "./option-picker";

const MAX_NAMED_OPTIONS = 3;

@Component({
	selector: "app-multi-option-picker",
	imports: [
		NgTemplateOutlet,
		NgpListbox,
		NgpListboxOption,
		NgpPopover,
		NgpPopoverTrigger,
		UiBottomSheet,
		UiButton,
		UiInput
	],
	templateUrl: "./multi-option-picker.html",
	host: { class: "block min-w-0" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class MultiOptionPicker {
	readonly label = input.required<string>();
	readonly heading = input.required<string>();
	readonly options = input.required<readonly PickerOption[]>();
	readonly values = model<readonly string[]>([]);
	readonly placeholder = input("None");
	readonly placeholderIcon = input("tune");
	readonly noun = input("selected");
	readonly searchLabel = input("Search");
	readonly searchThreshold = input(8);

	protected readonly isMobile = inject(ViewportService).isMobile;
	protected readonly sheetOpen = signal(false);
	protected readonly query = signal("");
	private readonly list = viewChild<ElementRef<HTMLElement>>("list");

	protected readonly listboxValue = computed(() => [...this.values()]);

	protected readonly chosen = computed(() => new Set(this.values()));

	protected readonly selectedOptions = computed(() => {
		const chosen = this.chosen();
		return this.options().filter(option => chosen.has(option.value));
	});

	protected readonly summary = computed(() => {
		const total = this.values().length;
		const picked = this.selectedOptions();
		if (total === 0) return this.placeholder();
		if (picked.length === 1 && total === 1) return picked[0].label;
		if (picked.length === total && total <= MAX_NAMED_OPTIONS)
			return picked
				.map(option => option.shortLabel ?? option.label)
				.join(", ");
		return `${total} ${this.noun()}`;
	});

	protected readonly searchable = computed(
		() => this.options().length > this.searchThreshold()
	);

	protected readonly visibleOptions = computed(() => {
		const term = this.query().trim().toLowerCase();
		if (!term) return this.options();
		return this.options().filter(option =>
			[option.label, option.shortLabel].some(text =>
				text?.toLowerCase().includes(term)
			)
		);
	});

	protected openSheet() {
		if (this.isMobile()) this.sheetOpen.set(true);
	}

	protected closeSheet() {
		this.sheetOpen.set(false);
		this.query.set("");
	}

	protected setQuery(event: Event) {
		this.query.set((event.target as HTMLInputElement).value);
	}

	protected focusList(event: Event) {
		event.preventDefault();
		this.list()?.nativeElement.focus();
	}

	protected change(next: readonly string[]) {
		const order = new Map(
			this.options().map((option, index) => [option.value, index])
		);
		const rank = (value: string) => order.get(value) ?? order.size;
		this.values.set([...next].sort((a, b) => rank(a) - rank(b)));
	}

	protected clear() {
		this.values.set([]);
	}
}
