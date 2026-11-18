import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	linkedSignal,
	output,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";

import {
	UiButton,
	type UiPickerOption,
	UiSkeleton
} from "../../../../shared/ui";
import { TAG_FILTER_LIMIT } from "../../backlog-tag-params";
import {
	tagChipClass,
	tagChipCountClass,
	tagChipIconClass
} from "./backlog-tag-chip-classes";
import { type BacklogTagFilterStatus } from "./backlog-tag-filter.model";

const COLLAPSED_CHIP_COUNT = 12;
const SKELETON_CHIP_WIDTHS = ["w-16", "w-20", "w-14", "w-24", "w-16", "w-20"];

@Component({
	selector: "app-backlog-tag-filter",
	imports: [RouterLink, UiButton, UiSkeleton],
	templateUrl: "./backlog-tag-filter.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogTagFilter {
	readonly options = input.required<readonly UiPickerOption[]>();
	readonly selected = input.required<readonly string[]>();
	readonly status = input<BacklogTagFilterStatus>("ready");

	readonly selectedChange = output<string[]>();
	readonly limitReached = output<number>();
	readonly retried = output();
	readonly manageOpened = output();

	protected readonly skeletonWidths = SKELETON_CHIP_WIDTHS;
	protected readonly expanded = signal(false);
	protected readonly chipClass = tagChipClass;
	protected readonly chipIconClass = tagChipIconClass;
	protected readonly chipCountClass = tagChipCountClass;
	private readonly pendingSelection = linkedSignal<readonly string[]>(() =>
		this.selected()
	);
	private readonly selectedSet = computed(
		() => new Set(this.pendingSelection())
	);

	private readonly allOptions = computed<UiPickerOption[]>(() => {
		const known = new Set(this.options().map(option => option.value));
		const missingSelected = this.selected()
			.filter(tag => !known.has(tag))
			.map(tag => ({ value: tag, label: tag }));
		return [...missingSelected, ...this.options()];
	});

	protected readonly totalCount = computed(() => this.allOptions().length);

	protected readonly hiddenCount = computed(() =>
		Math.max(0, this.totalCount() - COLLAPSED_CHIP_COUNT)
	);

	protected readonly visibleOptions = computed(() => {
		const all = this.allOptions();
		if (this.expanded() || all.length <= COLLAPSED_CHIP_COUNT) return all;
		const selected = new Set(this.selected());
		return all.filter(
			(option, index) =>
				index < COLLAPSED_CHIP_COUNT || selected.has(option.value)
		);
	});

	protected readonly hasSelection = computed(
		() => this.selected().length > 0
	);

	protected isSelected(tag: string): boolean {
		return this.selectedSet().has(tag);
	}

	protected toggle(tag: string) {
		const selected = this.pendingSelection();
		if (!this.isSelected(tag) && selected.length >= TAG_FILTER_LIMIT) {
			this.limitReached.emit(TAG_FILTER_LIMIT);
			return;
		}
		const next = this.isSelected(tag)
			? selected.filter(value => value !== tag)
			: [...selected, tag];
		this.pendingSelection.set(next);
		this.selectedChange.emit(next);
	}

	protected clear() {
		if (!this.hasSelection()) return;
		this.pendingSelection.set([]);
		this.selectedChange.emit([]);
	}
}
