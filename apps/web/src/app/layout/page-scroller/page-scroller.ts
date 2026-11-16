import {
	DestroyRef,
	Directive,
	ElementRef,
	inject,
	Injector,
	signal
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { NavigationEnd, NavigationStart, Router } from "@angular/router";

import { restoreScrollPosition } from "./restore-scroll-position";
import { ScrollPositionMemory } from "./scroll-position-memory";

export const MAIN_CONTENT_ID = "main-content";
const SCROLLED_THRESHOLD_PX = 8;
const REMEMBERED_PAGES_LIMIT = 50;

function pathOf(url: string): string {
	return url.split(/[?#]/)[0];
}

function hasFragment(url: string): boolean {
	return url.includes("#");
}

@Directive({
	selector: "main[appPageScroller]",
	exportAs: "appPageScroller",
	host: {
		id: MAIN_CONTENT_ID,
		tabindex: "-1",
		class: "page-scroller overflow-y-auto overflow-x-hidden bg-canvas flex flex-col focus:outline-none"
	}
})
export class PageScroller {
	private readonly scroller: HTMLElement = inject(ElementRef).nativeElement;
	private readonly router = inject(Router);
	private readonly injector = inject(Injector);
	private readonly destroyRef = inject(DestroyRef);
	private readonly positions = new ScrollPositionMemory(
		REMEMBERED_PAGES_LIMIT
	);
	private readonly isScrolled = signal(false);

	readonly scrolled = this.isScrolled.asReadonly();

	private currentNavigationId: number | null = null;
	private currentPath: string | null = null;
	private navigationIdToRestore: number | null = null;
	private restoringTo: number | null = null;
	private stopRestoring: () => void = () => undefined;

	constructor() {
		this.trackScrolled();
		this.followNavigation();
		this.destroyRef.onDestroy(() => this.stopRestoring());
	}

	private trackScrolled() {
		const update = () =>
			this.isScrolled.set(
				this.scroller.scrollTop > SCROLLED_THRESHOLD_PX
			);
		this.scroller.addEventListener("scroll", update, { passive: true });
		this.destroyRef.onDestroy(() =>
			this.scroller.removeEventListener("scroll", update)
		);
	}

	private followNavigation() {
		this.router.events
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(event => {
				if (event instanceof NavigationStart) this.leavePage(event);
				else if (event instanceof NavigationEnd) this.enterPage(event);
			});
	}

	private leavePage(event: NavigationStart) {
		if (this.currentNavigationId !== null) {
			this.positions.remember(
				this.currentNavigationId,
				this.restoringTo ?? this.scroller.scrollTop
			);
		}
		this.navigationIdToRestore =
			event.navigationTrigger === "popstate"
				? (event.restoredState?.navigationId ?? null)
				: null;
	}

	private enterPage(event: NavigationEnd) {
		this.stopRestoring();
		const url = event.urlAfterRedirects;
		const samePath = pathOf(url) === this.currentPath;
		this.currentNavigationId = event.id;
		this.currentPath = pathOf(url);
		const remembered =
			this.navigationIdToRestore === null
				? undefined
				: this.positions.recall(this.navigationIdToRestore);
		this.navigationIdToRestore = null;
		if (remembered !== undefined) this.restore(remembered);
		else if (!samePath && !hasFragment(url)) this.scroller.scrollTop = 0;
	}

	private restore(target: number) {
		this.restoringTo = target;
		this.stopRestoring = restoreScrollPosition(
			this.scroller,
			target,
			this.injector,
			() => {
				this.restoringTo = null;
				this.stopRestoring = () => undefined;
			}
		);
	}
}
