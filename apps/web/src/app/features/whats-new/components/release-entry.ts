import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import {
	releaseTintClass,
	releaseTintTextClass,
	type ReleaseView
} from "../release.model";

@Component({
	selector: "app-release-entry",
	imports: [DatePipe],
	template: `
		@let entry = release();
		@if (variant() === "featured") {
			<article
				[id]="entry.anchor"
				[attr.aria-labelledby]="entry.anchor + '-title'"
				class="relative isolate overflow-hidden rounded-card border border-brand/30 bg-surface p-5 sm:p-8 scroll-mt-[calc(var(--topbar-height)+1rem)]"
			>
				<div
					aria-hidden="true"
					class="absolute -z-10 -top-32 -right-20 w-80 h-80 rounded-full bg-brand-glow blur-3xl opacity-50"
				></div>
				<div class="flex flex-wrap items-center gap-2">
					<span
						class="px-2.5 py-1 rounded-full bg-brand-solid text-white text-[0.6875rem] font-bold uppercase tracking-[0.16em]"
						>Latest</span
					>
					<span
						class="px-2.5 py-1 rounded-full text-[0.6875rem] font-semibold uppercase tracking-[0.16em]"
						[class]="tintClass(entry.tint)"
						>{{ entry.tag }}</span
					>
					<time
						class="text-xs text-fg-muted"
						[attr.datetime]="entry.date"
						>{{ entry.date | date: "MMMM d, y" : "UTC" }}</time
					>
				</div>
				<h2
					[id]="entry.anchor + '-title'"
					class="font-display m-0 mt-4 max-w-[30ch] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight [text-wrap:balance]"
				>
					{{ entry.title }}
				</h2>
				<ul
					class="m-0 mt-6 p-0 list-none grid gap-x-8 gap-y-5 md:grid-cols-2"
				>
					@for (item of entry.highlights; track item.text) {
						<li class="flex items-start gap-3">
							<span
								aria-hidden="true"
								class="material-icons flex items-center justify-center w-9 h-9 shrink-0 rounded-lg text-[1.125rem]"
								[class]="tintClass(item.tint)"
								>{{ item.icon }}</span
							>
							<span
								class="pt-1.5 text-sm text-fg-secondary leading-relaxed"
								>{{ item.text }}</span
							>
						</li>
					}
				</ul>
			</article>
		} @else {
			<article
				[id]="entry.anchor"
				[attr.aria-labelledby]="entry.anchor + '-title'"
				class="relative scroll-mt-[calc(var(--topbar-height)+3rem)]"
			>
				<span
					aria-hidden="true"
					class="material-icons absolute -left-[calc(1.5rem+1px)] sm:-left-[calc(2rem+1px)] top-0 -translate-x-1/2 flex items-center justify-center w-8 h-8 rounded-full ring-4 ring-canvas text-base"
					[class]="tintClass(entry.tint)"
					>{{ entry.icon }}</span
				>
				<div
					class="flex flex-wrap items-center gap-x-2 gap-y-1 min-h-8"
				>
					<time
						class="text-xs font-medium text-fg-muted tabular-nums"
						[attr.datetime]="entry.date"
						>{{ entry.date | date: "MMM d" : "UTC" }}</time
					>
					<span aria-hidden="true" class="text-fg-muted">·</span>
					<span
						class="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-fg-secondary"
						>{{ entry.tag }}</span
					>
				</div>
				<h4
					[id]="entry.anchor + '-title'"
					class="font-display m-0 mt-1 text-lg font-semibold text-fg leading-snug"
				>
					{{ entry.title }}
				</h4>
				<ul class="m-0 mt-3 p-0 list-none flex flex-col gap-2.5">
					@for (item of entry.highlights; track item.text) {
						<li class="flex items-start gap-2.5">
							<span
								aria-hidden="true"
								class="material-icons mt-0.5 text-base"
								[class]="tintTextClass(item.tint)"
								>{{ item.icon }}</span
							>
							<span
								class="max-w-[72ch] text-sm text-fg-secondary leading-relaxed"
								>{{ item.text }}</span
							>
						</li>
					}
				</ul>
			</article>
		}
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReleaseEntryCard {
	readonly release = input.required<ReleaseView>();
	readonly variant = input<"featured" | "timeline">("timeline");

	protected readonly tintClass = releaseTintClass;
	protected readonly tintTextClass = releaseTintTextClass;
}
