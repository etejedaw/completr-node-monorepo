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
	type UiChipOption,
	UiEyebrow,
	UiSegmentedControl,
	type UiSegmentedOption,
	UiSkeleton
} from "../../../../shared/ui";
import { type BacklogTagSource } from "../../backlog-list/backlog-list.model";
import { TAG_FILTER_LIMIT } from "../../backlog-tag-params";
import {
	tagChipClass,
	tagChipCountClass,
	tagChipIconClass
} from "./backlog-tag-chip-classes";
import { type BacklogTagFilterStatus } from "./backlog-tag-filter.model";

const COLLAPSED_CHIP_COUNT = 12;
const SKELETON_CHIP_WIDTHS = ["w-16", "w-20", "w-14", "w-24", "w-16", "w-20"];

const SOURCE_LABELS: Record<BacklogTagSource, string> = {
	mine: "My tags",
	community: "Community"
};

const SOURCE_HINTS: Record<BacklogTagSource, string> = {
	mine: "Filter by the tags you put on your games",
	community: "Filter by tags at least 2 players use on a game"
};

@Component({
	selector: "app-backlog-tag-filter",
	imports: [RouterLink, UiButton, UiEyebrow, UiSegmentedControl, UiSkeleton],
	templateUrl: "./backlog-tag-filter.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogTagFilter {
	readonly source = input.required<BacklogTagSource>();
	readonly options = input.required<readonly UiChipOption[]>();
	readonly selected = input.required<readonly string[]>();
	readonly selectedMineCount = input(0);
	readonly selectedCommunityCount = input(0);
	readonly status = input<BacklogTagFilterStatus>("ready");
	readonly showHeading = input(true);

	readonly sourceChange = output<BacklogTagSource>();
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

	protected readonly sourceOptions = computed<
		UiSegmentedOption<BacklogTagSource>[]
	>(() => [
		this.sourceOption("mine", this.selectedMineCount()),
		this.sourceOption("community", this.selectedCommunityCount())
	]);

	protected readonly groupLabel = computed(() =>
		this.source() === "mine"
			? "Filter by your tags"
			: "Filter by community tags"
	);

	private readonly allOptions = computed<UiChipOption[]>(() => {
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

	protected changeSource(source: BacklogTagSource) {
		if (source === this.source()) return;
		this.expanded.set(false);
		this.sourceChange.emit(source);
	}

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

	private sourceOption(
		source: BacklogTagSource,
		count: number
	): UiSegmentedOption<BacklogTagSource> {
		return {
			value: source,
			label: SOURCE_LABELS[source],
			hint: SOURCE_HINTS[source],
			count: count > 0 ? count : undefined
		};
	}
}
