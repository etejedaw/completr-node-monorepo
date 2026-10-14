import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import { type BacklogStatus } from "../../../../core/models";
import {
	BACKLOG_STATUS_ORDER,
	backlogStatusFillClass,
	backlogStatusLabel
} from "../../../../shared/utils/backlog-status";

export type StatusCounts = Record<BacklogStatus, number>;

interface StatusShare {
	status: BacklogStatus;
	label: string;
	count: number;
	percent: number;
	fillClass: string;
}

@Component({
	selector: "app-status-breakdown",
	template: `
		<div
			class="flex h-2.5 gap-[2px] rounded-full overflow-hidden bg-line"
			role="img"
			[attr.aria-label]="summary()"
		>
			@for (share of visibleShares(); track share.status) {
				<span
					class="h-full basis-0 min-w-[4px] transition-[flex-grow] duration-500 motion-reduce:transition-none"
					[class]="share.fillClass"
					[style.flex-grow]="share.count"
					[title]="share.label + ': ' + share.count"
				></span>
			}
		</div>
		<ul class="list-none m-0 p-0 flex flex-col gap-1.5" aria-hidden="true">
			@for (share of shares(); track share.status) {
				<li
					class="flex items-center gap-2 min-w-0 text-xs"
					[class.opacity-50]="share.count === 0"
				>
					<span
						class="size-2 rounded-full shrink-0"
						[class]="share.fillClass"
					></span>
					<span class="truncate text-fg-secondary">{{
						share.label
					}}</span>
					<span class="ml-auto font-semibold text-fg tabular-nums">{{
						share.count
					}}</span>
					<span class="w-8 text-right text-fg-muted tabular-nums"
						>{{ share.percent }}%</span
					>
				</li>
			}
		</ul>
	`,
	host: { class: "flex flex-col gap-3" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusBreakdown {
	readonly counts = input.required<StatusCounts>();

	protected readonly shares = computed<StatusShare[]>(() => {
		const counts = this.counts();
		const total = BACKLOG_STATUS_ORDER.reduce(
			(sum, status) => sum + (counts[status] ?? 0),
			0
		);
		return BACKLOG_STATUS_ORDER.map(status => {
			const count = counts[status] ?? 0;
			return {
				status,
				label: backlogStatusLabel(status),
				count,
				percent: total ? Math.round((count / total) * 100) : 0,
				fillClass: backlogStatusFillClass(status)
			};
		});
	});

	protected readonly visibleShares = computed(() =>
		this.shares().filter(share => share.count > 0)
	);

	protected readonly summary = computed(() => {
		const parts = this.shares().map(
			share => `${share.label} ${share.count} (${share.percent}%)`
		);
		return `Games by status: ${parts.join(", ")}`;
	});
}
