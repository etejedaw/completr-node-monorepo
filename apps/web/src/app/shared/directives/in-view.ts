import {
	afterNextRender,
	DestroyRef,
	Directive,
	ElementRef,
	inject,
	input,
	output
} from "@angular/core";

@Directive({
	selector: "[appInView]"
})
export class InView {
	readonly inViewRootMargin = input("0px");
	readonly inViewChange = output<boolean>();

	private readonly host =
		inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
	private readonly destroyRef = inject(DestroyRef);

	constructor() {
		afterNextRender(() => this.observe());
	}

	private observe(): void {
		if (typeof IntersectionObserver === "undefined") return;
		const observer = new IntersectionObserver(
			([entry]) => this.inViewChange.emit(entry.isIntersecting),
			{ rootMargin: this.inViewRootMargin() }
		);
		observer.observe(this.host);
		this.destroyRef.onDestroy(() => observer.disconnect());
	}
}
