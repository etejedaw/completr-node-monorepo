import {
	afterRenderEffect,
	ChangeDetectionStrategy,
	Component,
	type ElementRef,
	input,
	output,
	viewChild
} from "@angular/core";
import { RouterLink } from "@angular/router";

export interface HelpSection {
	id: string;
	label: string;
	icon: string;
}

@Component({
	selector: "app-help-toc",
	imports: [RouterLink],
	template: `
		@if (variant() === "rail") {
			<nav aria-label="Guide sections">
				<p
					class="m-0 mb-3 px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-fg-muted"
				>
					On this page
				</p>
				<ol
					class="m-0 p-0 list-none flex flex-col border-l border-line"
				>
					@for (
						section of sections();
						track section.id;
						let i = $index
					) {
						<li>
							<a
								routerLink="/help"
								[fragment]="section.id"
								class="-ml-px flex items-center gap-3 min-h-[40px] pointer-coarse:min-h-[44px] pl-4 pr-3 border-l-2 no-underline text-sm transition-colors focus-visible:outline-2 focus-visible:outline-brand"
								[class]="
									section.id === active()
										? 'border-brand text-fg font-semibold'
										: 'border-transparent text-fg-muted hover:text-fg hover:border-line-hover'
								"
								[attr.aria-current]="
									section.id === active() ? 'location' : null
								"
								(click)="selected.emit(section.id)"
							>
								<span
									class="w-5 text-[0.6875rem] tabular-nums"
									[class.text-brand]="section.id === active()"
									>{{ pad(i + 1) }}</span
								>
								{{ section.label }}
							</a>
						</li>
					}
				</ol>
			</nav>
		} @else {
			<nav
				#chipScroller
				aria-label="Guide sections"
				class="relative -mx-1 px-1 overflow-x-auto [scrollbar-width:none]"
			>
				<ol class="m-0 p-0 list-none flex gap-2 w-max">
					@for (section of sections(); track section.id) {
						<li>
							<a
								routerLink="/help"
								[fragment]="section.id"
								[attr.data-section]="section.id"
								class="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-full border text-[0.8125rem] font-medium whitespace-nowrap no-underline transition-colors"
								[class]="
									section.id === active()
										? 'border-brand bg-brand-subtle text-brand'
										: 'border-line text-fg-secondary hover:border-line-hover hover:text-fg'
								"
								[attr.aria-current]="
									section.id === active() ? 'location' : null
								"
								(click)="selected.emit(section.id)"
							>
								<span
									aria-hidden="true"
									class="material-icons text-base"
									>{{ section.icon }}</span
								>
								{{ section.label }}
							</a>
						</li>
					}
				</ol>
			</nav>
		}
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelpToc {
	readonly sections = input.required<readonly HelpSection[]>();
	readonly active = input.required<string>();
	readonly variant = input<"rail" | "chips">("rail");

	readonly selected = output<string>();

	private readonly chipScroller =
		viewChild<ElementRef<HTMLElement>>("chipScroller");

	constructor() {
		afterRenderEffect(() => {
			const scroller = this.chipScroller()?.nativeElement;
			const active = this.active();
			if (!scroller) return;
			const chip = scroller.querySelector<HTMLElement>(
				`[data-section="${active}"]`
			);
			if (!chip) return;
			scroller.scrollTo({
				left:
					chip.offsetLeft -
					scroller.clientWidth / 2 +
					chip.offsetWidth / 2,
				behavior: "smooth"
			});
		});
	}

	protected pad(n: number): string {
		return n.toString().padStart(2, "0");
	}
}
