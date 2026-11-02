import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import { type MonthlyCount } from "../../saved-filters.model";
import { type MonthColumn } from "./completions-chart.model";

const MOBILE_TICK_EVERY = 3;

function monthDate(month: string): Date {
	const [year, monthNumber] = month.split("-").map(Number);
	return new Date(Date.UTC(year ?? 1970, (monthNumber ?? 1) - 1, 1));
}

function formatMonth(date: Date, options: Intl.DateTimeFormatOptions): string {
	return date.toLocaleString("en", { ...options, timeZone: "UTC" });
}

function tooltipAlignClass(index: number, total: number): string {
	if (index < 2) return "left-0";
	if (index > total - 3) return "right-0";
	return "left-1/2 -translate-x-1/2";
}

@Component({
	selector: "app-completions-chart",
	template: `
		<ol
			class="list-none m-0 p-0 pt-5 flex items-stretch gap-1 sm:gap-1.5 h-36 border-b border-line"
			aria-label="Completed games per month"
		>
			@for (column of columns(); track column.month) {
				<li
					class="group relative flex-1 min-w-0 flex flex-col justify-end rounded-t-[4px] cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
					tabindex="0"
				>
					<span class="sr-only"
						>{{ column.fullLabel }}:
						{{ column.count }} completed</span
					>
					<span
						aria-hidden="true"
						class="relative block w-full rounded-t-[4px] transition-[height,background-color] duration-500 motion-reduce:transition-none group-hover:bg-brand-hover group-focus:bg-brand-hover"
						[class.bg-brand]="column.count > 0"
						[class.bg-line]="column.count === 0"
						[style.height]="
							column.count > 0
								? column.heightPercent + '%'
								: '2px'
						"
					>
						@if (column.isPeak) {
							<span
								class="absolute bottom-full inset-x-0 mb-1 text-center text-[0.6875rem] font-semibold text-fg tabular-nums leading-none"
								>{{ column.count }}</span
							>
						}
					</span>
					<span
						aria-hidden="true"
						class="pointer-events-none absolute bottom-full mb-1.5 z-10 whitespace-nowrap rounded-md border border-line-hover bg-canvas px-2 py-1 text-[0.6875rem] text-fg shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100"
						[class]="column.tooltipAlignClass"
					>
						<span class="text-fg-muted">{{
							column.fullLabel
						}}</span>
						·
						<strong class="font-semibold tabular-nums">{{
							column.count
						}}</strong>
						completed
					</span>
				</li>
			}
		</ol>
		<div class="flex gap-1 sm:gap-1.5" aria-hidden="true">
			@for (column of columns(); track column.month) {
				<span
					class="flex-1 min-w-0 flex flex-col items-center gap-0.5 text-[0.625rem] leading-none text-fg-muted"
					[class.max-sm:invisible]="column.hideTickOnMobile"
				>
					<span>{{ column.shortLabel }}</span>
					<span
						class="h-[0.625rem] text-fg-muted/70 tabular-nums max-sm:hidden"
						>{{ column.yearLabel ?? "" }}</span
					>
				</span>
			}
		</div>
	`,
	host: { class: "flex flex-col gap-1.5" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class CompletionsChart {
	readonly months = input.required<readonly MonthlyCount[]>();

	protected readonly columns = computed<MonthColumn[]>(() => {
		const months = this.months();
		const max = Math.max(0, ...months.map(month => month.count));
		const lastIndex = months.length - 1;
		return months.map((entry, index) => {
			const date = monthDate(entry.month);
			const showYear = index === 0 || date.getUTCMonth() === 0;
			const distanceFromEnd = lastIndex - index;
			return {
				month: entry.month,
				count: entry.count,
				heightPercent: max ? Math.max(6, (entry.count / max) * 100) : 0,
				shortLabel: formatMonth(date, { month: "short" }),
				fullLabel: formatMonth(date, {
					month: "long",
					year: "numeric"
				}),
				yearLabel: showYear
					? `’${formatMonth(date, { year: "2-digit" })}`
					: null,
				isPeak: max > 0 && entry.count === max,
				hideTickOnMobile: distanceFromEnd % MOBILE_TICK_EVERY !== 0,
				tooltipAlignClass: tooltipAlignClass(index, months.length)
			};
		});
	});
}
