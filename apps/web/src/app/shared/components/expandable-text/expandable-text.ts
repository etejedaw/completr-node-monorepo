import {
	afterNextRender,
	afterRenderEffect,
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	type ElementRef,
	inject,
	input,
	linkedSignal,
	signal,
	viewChild
} from "@angular/core";

let nextContentId = 0;

@Component({
	selector: "app-expandable-text",
	templateUrl: "./expandable-text.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpandableText {
	text = input.required<string>();
	lines = input<4 | 6>(6);

	private readonly content =
		viewChild.required<ElementRef<HTMLElement>>("content");

	protected readonly contentId = `expandable-text-${nextContentId++}`;
	protected readonly expanded = linkedSignal({
		source: this.text,
		computation: () => false
	});
	protected readonly overflows = signal(false);
	private readonly contentWidth = signal(0);

	constructor() {
		const destroyRef = inject(DestroyRef);

		afterNextRender(() => {
			const observer = new ResizeObserver(([entry]) =>
				this.contentWidth.set(entry.contentRect.width)
			);
			observer.observe(this.content().nativeElement);
			destroyRef.onDestroy(() => observer.disconnect());
		});

		afterRenderEffect(() => {
			this.text();
			this.contentWidth();
			if (this.expanded()) return;
			const element = this.content().nativeElement;
			this.overflows.set(element.scrollHeight > element.clientHeight);
		});
	}

	protected toggle(): void {
		this.expanded.update(expanded => !expanded);
	}
}
