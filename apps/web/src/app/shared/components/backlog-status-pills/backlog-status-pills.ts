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

export type BacklogStatusPillsLayout = "wrap" | "scroll";

const PILL_BASE_CLASS =
	"inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-line bg-surface/60 backdrop-blur text-sm font-medium text-fg-secondary cursor-pointer transition hover:border-line-hover hover:text-fg";

const LAYOUT_CLASSES: Record<
	BacklogStatusPillsLayout,
	{ nav: string; pill: string }
> = {
	wrap: {
		nav: "max-md:hidden flex flex-wrap gap-2",
		pill: `${PILL_BASE_CLASS} tap:h-11`
	},
	scroll: {
		nav: "max-md:hidden -mx-[var(--page-pad-x)] px-[var(--page-pad-x)] pointer-coarse:py-[8px] pointer-coarse:-mb-[8px] flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
		pill: `tap-area shrink-0 ${PILL_BASE_CLASS}`
	}
};

const ALL_STATUSES = "";

@Component({
	selector: "app-backlog-status-pills",
	template: `
		<nav aria-label="Filter by status" [class]="classes().nav">
			@for (option of options; track option.value) {
				<button
					type="button"
					[class]="classes().pill"
					[class.!text-brand]="isActive(option.value)"
					[class.!border-brand]="isActive(option.value)"
					[class.!bg-brand-subtle]="isActive(option.value)"
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
	protected readonly classes = computed(() => LAYOUT_CLASSES[this.layout()]);
	protected readonly icon = backlogStatusIcon;
	protected readonly iconColor = backlogStatusIconColor;

	protected isActive(value: string): boolean {
		const selected = this.selected();
		return value === ALL_STATUSES
			? selected.length === 0
			: selected.length === 1 && selected[0] === value;
	}
}
