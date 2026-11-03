import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";

import {
	BACKLOG_STATUS_FILTERS,
	backlogStatusIcon,
	backlogStatusIconColor
} from "../../utils/backlog-status";
import {
	FilterChip,
	type FilterChipTouchTarget
} from "../chip-group/filter-chip";

export type BacklogStatusPillsLayout = "wrap" | "scroll";

const NAV_CLASSES: Record<BacklogStatusPillsLayout, string> = {
	wrap: "max-md:hidden flex flex-wrap gap-2",
	scroll: "max-md:hidden -mx-[var(--page-pad-x)] px-[var(--page-pad-x)] tap:py-[8px] tap:-mb-[8px] flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
};

const TOUCH_TARGETS: Record<BacklogStatusPillsLayout, FilterChipTouchTarget> = {
	wrap: "grow",
	scroll: "area"
};

const ALL_STATUSES = "";

@Component({
	selector: "app-backlog-status-pills",
	imports: [FilterChip],
	template: `
		<nav aria-label="Filter by status" [class]="navClass()">
			@for (option of options; track option.value) {
				<button
					appFilterChip
					chipSize="md"
					[touchTarget]="touchTarget()"
					[selected]="isActive(option.value)"
					[attr.aria-pressed]="isActive(option.value)"
					(click)="statusSelect.emit(option.value)"
				>
					@if (option.status; as status) {
						<span
							aria-hidden="true"
							class="material-icons text-base"
							[class]="iconColor(status)"
							>{{ icon(status) }}</span
						>
					}
					{{ option.label }}
				</button>
			}
		</nav>
	`,
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogStatusPills {
	readonly selected = input.required<readonly string[]>();
	readonly layout = input<BacklogStatusPillsLayout>("wrap");
	readonly statusSelect = output<string>();

	protected readonly options = [
		{ value: ALL_STATUSES, label: "All", status: null },
		...BACKLOG_STATUS_FILTERS.map(filter => ({
			...filter,
			status: filter.value
		}))
	];
	protected readonly navClass = computed(() => NAV_CLASSES[this.layout()]);
	protected readonly touchTarget = computed(
		() => TOUCH_TARGETS[this.layout()]
	);
	protected readonly icon = backlogStatusIcon;
	protected readonly iconColor = backlogStatusIconColor;

	protected isActive(value: string): boolean {
		const selected = this.selected();
		return value === ALL_STATUSES
			? selected.length === 0
			: selected.length === 1 && selected[0] === value;
	}
}
