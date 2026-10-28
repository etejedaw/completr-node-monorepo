import {
	afterNextRender,
	DestroyRef,
	Directive,
	DOCUMENT,
	ElementRef,
	inject,
	input,
	signal
} from "@angular/core";

import { canAnimateRewind } from "./rewind-motion";

export type RewindRevealState = "hidden" | "shown";

const REVEAL_ROOT_MARGIN = "0px 0px -8% 0px";

@Directive({
	selector: "[appRewindReveal]",
	host: {
		class: "motion-safe:transition-[opacity,translate] motion-safe:duration-[420ms] motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:data-[reveal=hidden]:translate-y-4 motion-safe:data-[reveal=hidden]:opacity-0",
		"[attr.data-reveal]": "state()",
		"[style.transition-delay.ms]": "state() === 'shown' ? revealDelay() : 0"
	}
})
export class RewindReveal {
	readonly revealDelay = input(0);

	private readonly host =
		inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
	private readonly destroyRef = inject(DestroyRef);
	protected readonly state = signal<RewindRevealState>(
		canAnimateRewind(inject(DOCUMENT).defaultView) ? "hidden" : "shown"
	);

	constructor() {
		afterNextRender(() => this.observe());
	}

	private observe(): void {
		if (this.state() === "shown") return;
		const observer = new IntersectionObserver(
			entries => {
				if (this.state() === "shown") return;
				if (!entries.some(entry => entry.isIntersecting)) return;
				this.state.set("shown");
				observer.disconnect();
			},
			{ rootMargin: REVEAL_ROOT_MARGIN }
		);
		observer.observe(this.host);
		this.destroyRef.onDestroy(() => observer.disconnect());
	}
}
