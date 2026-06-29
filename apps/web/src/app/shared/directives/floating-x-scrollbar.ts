import {
	Directive,
	ElementRef,
	NgZone,
	OnDestroy,
	afterNextRender,
	inject
} from "@angular/core";

@Directive({
	selector: "[appFloatingXScrollbar]"
})
export class FloatingXScrollbar implements OnDestroy {
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
	private readonly zone = inject(NgZone);

	private bar?: HTMLElement;
	private resizeObserver?: ResizeObserver;
	private teardown: () => void = () => {};

	constructor() {
		afterNextRender(() => this.setup());
	}

	private setup(): void {
		const host = this.host;

		this.zone.runOutsideAngular(() => {
			const bar = document.createElement("div");
			bar.className = "floating-x-scrollbar";
			bar.setAttribute("aria-hidden", "true");

			const spacer = document.createElement("div");
			spacer.style.height = "1px";
			bar.appendChild(spacer);

			host.parentNode?.insertBefore(bar, host.nextSibling);
			this.bar = bar;

			let lock = false;
			const mirror = (from: HTMLElement, to: HTMLElement) => {
				if (lock) {
					return;
				}
				lock = true;
				to.scrollLeft = from.scrollLeft;
				requestAnimationFrame(() => {
					lock = false;
				});
			};

			const onHostScroll = () => mirror(host, bar);
			const onBarScroll = () => mirror(bar, host);
			host.addEventListener("scroll", onHostScroll, { passive: true });
			bar.addEventListener("scroll", onBarScroll, { passive: true });

			const update = () => {
				spacer.style.width = `${host.scrollWidth}px`;
				bar.style.display =
					host.scrollWidth > host.clientWidth + 1 ? "block" : "none";
			};
			update();

			const ro = new ResizeObserver(update);
			ro.observe(host);
			const table = host.querySelector("table");
			if (table) {
				ro.observe(table);
			}
			this.resizeObserver = ro;

			this.teardown = () => {
				host.removeEventListener("scroll", onHostScroll);
				bar.removeEventListener("scroll", onBarScroll);
			};
		});
	}

	ngOnDestroy(): void {
		this.teardown();
		this.resizeObserver?.disconnect();
		this.bar?.remove();
	}
}
