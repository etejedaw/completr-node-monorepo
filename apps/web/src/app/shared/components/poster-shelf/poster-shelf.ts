import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	type ElementRef,
	inject,
	input,
	output,
	signal,
	viewChild
} from "@angular/core";

const SCROLL_EDGE_TOLERANCE = 4;

@Component({
	selector: "app-poster-shelf",
	template: `
		<section [attr.aria-labelledby]="headingId">
			<header class="flex items-end justify-between gap-3 mb-4">
				<div class="min-w-0">
					@if (eyebrow()) {
						<span
							class="block mb-1 text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-brand"
							>{{ eyebrow() }}</span
						>
					}
					<h2
						[id]="headingId"
						class="m-0 font-display text-xl sm:text-2xl font-bold text-fg tracking-tight flex items-center gap-2"
					>
						{{ heading() }}
						<ng-content select="[shelfHeadingIcon]" />
					</h2>
				</div>
				<div class="flex items-center gap-1 shrink-0">
					<ng-content select="[shelfActions]" />
					@if (seeAllLabel()) {
						<button
							type="button"
							class="inline-flex items-center gap-0.5 h-9 pointer-coarse:min-h-[44px] px-2.5 mr-1 rounded-md bg-transparent border-0 text-sm font-medium text-fg-secondary cursor-pointer transition hover:text-brand"
							(click)="seeAll.emit()"
						>
							{{ seeAllLabel() }}
							<span
								aria-hidden="true"
								class="material-icons text-lg"
								>chevron_right</span
							>
						</button>
					}
					<button
						type="button"
						class="hidden sm:inline-flex w-9 h-9 items-center justify-center rounded-full bg-surface border border-line text-fg-secondary cursor-pointer transition hover:border-brand hover:text-brand disabled:opacity-30 disabled:cursor-default disabled:hover:border-line disabled:hover:text-fg-secondary"
						[disabled]="atStart()"
						[attr.aria-label]="'Scroll ' + heading() + ' back'"
						(click)="scrollByPage(-1)"
					>
						<span aria-hidden="true" class="material-icons text-xl"
							>chevron_left</span
						>
					</button>
					<button
						type="button"
						class="hidden sm:inline-flex w-9 h-9 items-center justify-center rounded-full bg-surface border border-line text-fg-secondary cursor-pointer transition hover:border-brand hover:text-brand disabled:opacity-30 disabled:cursor-default disabled:hover:border-line disabled:hover:text-fg-secondary"
						[disabled]="atEnd()"
						[attr.aria-label]="'Scroll ' + heading() + ' forward'"
						(click)="scrollByPage(1)"
					>
						<span aria-hidden="true" class="material-icons text-xl"
							>chevron_right</span
						>
					</button>
				</div>
			</header>
			<div
				#scroller
				class="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:snap-start [&>*]:shrink-0"
				[class]="
					contained() ? '' : 'bleed bleed-inner bleed-scroll-snap'
				"
				(scroll)="updateEdges()"
			>
				<ng-content />
			</div>
		</section>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PosterShelf {
	private static nextId = 0;

	readonly heading = input.required<string>();
	readonly eyebrow = input<string | null>(null);
	readonly seeAllLabel = input<string | null>(null);
	readonly contained = input(false);

	readonly seeAll = output<void>();

	protected readonly headingId = `poster-shelf-${PosterShelf.nextId++}`;
	protected readonly atStart = signal(true);
	protected readonly atEnd = signal(false);

	private readonly scroller =
		viewChild.required<ElementRef<HTMLElement>>("scroller");

	constructor() {
		const destroyRef = inject(DestroyRef);
		afterNextRender(() => {
			this.updateEdges();
			const observer = new ResizeObserver(() => this.updateEdges());
			observer.observe(this.scroller().nativeElement);
			destroyRef.onDestroy(() => observer.disconnect());
		});
	}

	protected scrollByPage(direction: 1 | -1): void {
		const element = this.scroller().nativeElement;
		element.scrollBy({
			left: direction * element.clientWidth * 0.8,
			behavior: "smooth"
		});
	}

	protected updateEdges(): void {
		const element = this.scroller().nativeElement;
		const maxScroll = element.scrollWidth - element.clientWidth;
		this.atStart.set(element.scrollLeft <= SCROLL_EDGE_TOLERANCE);
		this.atEnd.set(element.scrollLeft >= maxScroll - SCROLL_EDGE_TOLERANCE);
	}
}
