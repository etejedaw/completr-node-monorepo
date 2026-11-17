import "@testing-library/jest-dom/vitest";

import { Location } from "@angular/common";
import { provideLocationMocks } from "@angular/common/testing";
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import {
	NavigationEnd,
	provideRouter,
	Router,
	RouterOutlet
} from "@angular/router";
import { fireEvent } from "@testing-library/angular";
import { filter, firstValueFrom } from "rxjs";

import { PageScroller } from "./page-scroller";

@Component({
	selector: "app-page-stub",
	template: `<h1>Page</h1>`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class PageStub {}

@Component({
	selector: "app-shell-host",
	imports: [PageScroller, RouterOutlet],
	template: `
		<main appPageScroller #pageScroller="appPageScroller">
			<header [class.scrolled-header]="pageScroller.scrolled()"></header>
			<div class="page-shell"><router-outlet /></div>
		</main>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class ShellHost {}

const VIEWPORT_HEIGHT = 600;

class FakeResizeObserver {
	static readonly instances: FakeResizeObserver[] = [];
	readonly observed: Element[] = [];
	disconnected = false;

	constructor(private readonly callback: ResizeObserverCallback) {
		FakeResizeObserver.instances.push(this);
	}

	observe(target: Element) {
		this.observed.push(target);
	}

	disconnect() {
		this.disconnected = true;
	}

	unobserve() {
		return undefined;
	}

	static resizeAll() {
		for (const observer of FakeResizeObserver.instances) {
			if (observer.disconnected) continue;
			observer.callback([], observer as unknown as ResizeObserver);
		}
	}
}

describe("PageScroller", () => {
	let fixture: ComponentFixture<ShellHost>;
	let router: Router;
	let location: Location;
	let main: HTMLElement;
	let contentHeight: number;

	function giveMainALayout(element: HTMLElement) {
		let top = 0;
		Object.defineProperty(element, "scrollTop", {
			configurable: true,
			get: () => top,
			set: (value: number) => {
				const maxTop = Math.max(0, contentHeight - VIEWPORT_HEIGHT);
				top = Math.min(Math.max(0, value), maxTop);
			}
		});
	}

	function scrollAsUser(position: number) {
		main.scrollTop = position;
		fireEvent.scroll(main);
		fixture.detectChanges();
	}

	async function settle() {
		await fixture.whenStable();
		fixture.detectChanges();
		await fixture.whenStable();
	}

	async function navigate(url: string, extras = {}) {
		await router.navigateByUrl(url, extras);
		await settle();
	}

	async function travelThroughHistory(move: () => void) {
		const arrived = firstValueFrom(
			router.events.pipe(filter(event => event instanceof NavigationEnd))
		);
		move();
		await arrived;
		await settle();
	}

	async function goBack() {
		await travelThroughHistory(() => location.back());
	}

	async function goForward() {
		await travelThroughHistory(() => location.forward());
	}

	function header() {
		return fixture.nativeElement.querySelector("header") as HTMLElement;
	}

	beforeEach(async () => {
		FakeResizeObserver.instances.length = 0;
		vi.stubGlobal("ResizeObserver", FakeResizeObserver);
		contentHeight = 5000;
		TestBed.configureTestingModule({
			providers: [
				provideRouter([
					{ path: "rewind/:year", component: PageStub },
					{ path: "games", component: PageStub },
					{ path: "feed", component: PageStub },
					{ path: "help", component: PageStub }
				]),
				provideLocationMocks()
			]
		});
		router = TestBed.inject(Router);
		location = TestBed.inject(Location);
		router.setUpLocationChangeListener();
		fixture = TestBed.createComponent(ShellHost);
		main = fixture.nativeElement.querySelector("main") as HTMLElement;
		giveMainALayout(main);
		fixture.detectChanges();
		await navigate("/rewind/2025");
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("is the page's main landmark, focusable by the skip link and without a focus ring", () => {
		expect(main).toHaveAttribute("id", "main-content");
		expect(main).toHaveAttribute("tabindex", "-1");
		expect(main).toHaveClass("page-scroller", "focus:outline-none");
	});

	it("marks the header as scrolled only past the threshold, also on a burst of garbage positions", () => {
		scrollAsUser(200);
		expect(header()).toHaveClass("scrolled-header");

		for (const position of [-50, 0, 9, 8, Number.MAX_SAFE_INTEGER, 3]) {
			scrollAsUser(position);
		}
		expect(header()).not.toHaveClass("scrolled-header");
	});

	it("opens a new page at the top even when the previous one was scrolled to the bottom", async () => {
		scrollAsUser(4400);

		await navigate("/rewind/2026");

		expect(main.scrollTop).toBe(0);
	});

	it("brings back the position each page had along a chain of back and forward", async () => {
		scrollAsUser(1200);
		await navigate("/games");
		scrollAsUser(800);
		await navigate("/feed");
		scrollAsUser(300);

		await goBack();
		expect(main.scrollTop).toBe(800);
		await goBack();
		expect(main.scrollTop).toBe(1200);
		await goForward();
		expect(main.scrollTop).toBe(800);
		await goForward();
		expect(main.scrollTop).toBe(300);
	});

	it("remembers where the user scrolled after coming back to a page", async () => {
		scrollAsUser(1200);
		await navigate("/games");
		await goBack();
		fireEvent.wheel(main);
		scrollAsUser(2000);
		await goForward();
		await goBack();

		expect(main.scrollTop).toBe(2000);
	});

	it("keeps the position when only the query params of the same page change", async () => {
		await navigate("/games");
		scrollAsUser(900);

		await navigate("/games?genres=rpg", { replaceUrl: true });
		expect(main.scrollTop).toBe(900);

		await navigate("/games?genres=rpg&page=2");
		expect(main.scrollTop).toBe(900);
	});

	it("leaves a link with a fragment to the anchor logic instead of jumping to the top", async () => {
		scrollAsUser(700);

		await navigate("/help#statuses");

		expect(main.scrollTop).toBe(700);
	});

	it("waits for a slow page to grow tall enough before restoring its position", async () => {
		scrollAsUser(3000);
		await navigate("/games");
		contentHeight = 1000;

		await goBack();
		expect(main.scrollTop).toBe(400);

		contentHeight = 5000;
		FakeResizeObserver.resizeAll();
		expect(main.scrollTop).toBe(3000);
	});

	it("holds the restored position while content above keeps loading, with scroll anchoring off until it settles", async () => {
		scrollAsUser(3000);
		await navigate("/games");
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		location.back();
		await vi.advanceTimersByTimeAsync(0);
		await settle();
		expect(main.scrollTop).toBe(3000);
		expect(main.style.overflowAnchor).toBe("none");

		main.scrollTop = 3994;
		FakeResizeObserver.resizeAll();
		expect(main.scrollTop).toBe(3000);

		vi.advanceTimersByTime(3000);
		expect(main.style.overflowAnchor).toBe("");
		main.scrollTop = 3500;
		FakeResizeObserver.resizeAll();
		expect(main.scrollTop).toBe(3500);
	});

	it("stops restoring as soon as the user scrolls on their own", async () => {
		scrollAsUser(3000);
		await navigate("/games");
		contentHeight = 1000;
		await goBack();

		fireEvent.wheel(main);
		scrollAsUser(100);
		contentHeight = 5000;
		FakeResizeObserver.resizeAll();

		expect(main.scrollTop).toBe(100);
	});

	it("gives up restoring when the page never grows", async () => {
		scrollAsUser(3000);
		await navigate("/games");
		contentHeight = 1000;
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		location.back();
		await vi.advanceTimersByTimeAsync(0);
		await settle();
		expect(router.url).toBe("/rewind/2025");
		expect(main.scrollTop).toBe(400);

		vi.advanceTimersByTime(3000);
		contentHeight = 5000;
		FakeResizeObserver.resizeAll();

		expect(main.scrollTop).toBe(400);
	});

	it("remembers the target, not the half-restored position, when the user leaves mid-restore", async () => {
		scrollAsUser(3000);
		await navigate("/games");
		contentHeight = 1000;
		await goBack();
		contentHeight = 5000;

		await navigate("/feed");
		expect(main.scrollTop).toBe(0);
		await goBack();

		expect(main.scrollTop).toBe(3000);
	});

	it("ends at the top of the last page after rapid clicks, and back still finds the first page", async () => {
		scrollAsUser(1500);

		void router.navigateByUrl("/games");
		void router.navigateByUrl("/feed");
		await router.navigateByUrl("/rewind/2026");
		await settle();
		expect(router.url).toBe("/rewind/2026");
		expect(main.scrollTop).toBe(0);

		await goBack();
		expect(main.scrollTop).toBe(1500);
	});

	it("stops watching the page when the shell goes away mid-restore", async () => {
		scrollAsUser(3000);
		await navigate("/games");
		contentHeight = 1000;
		await goBack();
		const restoring = FakeResizeObserver.instances.at(-1);

		fixture.destroy();

		expect(restoring?.disconnected).toBe(true);
	});
});
