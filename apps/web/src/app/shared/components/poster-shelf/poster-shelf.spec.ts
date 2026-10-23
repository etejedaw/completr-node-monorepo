import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { PosterShelf } from "./poster-shelf";

@Component({
	imports: [PosterShelf],
	template: `
		<app-poster-shelf heading="Trending" eyebrow="Today">
			<span shelfHeadingIcon class="icon">i</span>
			<button shelfActions type="button">Filter</button>
			<div class="poster">One</div>
		</app-poster-shelf>
	`
})
class Host {}

describe("PosterShelf", () => {
	let resizeCallback: (() => void) | null;
	let scrollBy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		resizeCallback = null;
		scrollBy = vi.fn();
		vi.stubGlobal(
			"ResizeObserver",
			class {
				constructor(callback: () => void) {
					resizeCallback = callback;
				}
				observe = vi.fn();
				disconnect = vi.fn();
			}
		);
		TestBed.configureTestingModule({ providers: [provideRouter([])] });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function render(inputs: Record<string, unknown> = {}) {
		const fixture = TestBed.createComponent(PosterShelf);
		fixture.componentRef.setInput("heading", "Trending");
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		return fixture;
	}

	function root(fixture: ReturnType<typeof render>) {
		return fixture.nativeElement as HTMLElement;
	}

	function scroller(fixture: ReturnType<typeof render>) {
		const element = root(fixture).querySelector(".snap-x") as HTMLElement;
		element.scrollBy = scrollBy as never;
		return element;
	}

	function setGeometry(
		element: HTMLElement,
		geometry: {
			scrollLeft: number;
			scrollWidth: number;
			clientWidth: number;
		}
	) {
		for (const [key, value] of Object.entries(geometry)) {
			Object.defineProperty(element, key, { value, configurable: true });
		}
	}

	function scrollButton(
		fixture: ReturnType<typeof render>,
		direction: string
	) {
		return root(fixture).querySelector(
			`[aria-label="Scroll Trending ${direction}"]`
		) as HTMLButtonElement;
	}

	it("labels the section by its heading", () => {
		const fixture = render();
		const heading = root(fixture).querySelector("h2") as HTMLElement;

		expect(heading.textContent).toContain("Trending");
		expect(
			root(fixture)
				.querySelector("section")
				?.getAttribute("aria-labelledby")
		).toBe(heading.id);
	});

	it("shows the eyebrow only when provided", () => {
		expect(root(render()).textContent).not.toContain("Today");
		expect(root(render({ eyebrow: "Today" })).textContent).toContain(
			"Today"
		);
	});

	it("projects the heading icon, actions and posters", () => {
		const fixture = TestBed.createComponent(Host);
		fixture.detectChanges();
		const element = fixture.nativeElement as HTMLElement;

		expect(element.querySelector("h2 .icon")).not.toBeNull();
		expect(element.querySelector("header button")?.textContent).toBe(
			"Filter"
		);
		expect(element.querySelector(".snap-x .poster")?.textContent).toBe(
			"One"
		);
	});

	it("bleeds the scroller unless contained", () => {
		expect(scroller(render()).classList).toContain("bleed");
		expect(scroller(render({ contained: true })).classList).not.toContain(
			"bleed"
		);
	});

	describe("see all", () => {
		it("renders nothing without a label", () => {
			expect(
				root(render({ seeAllLink: ["/x"] })).querySelector("a")
			).toBeNull();
		});

		it("renders a link with query params when a link is given", () => {
			const fixture = render({
				seeAllLabel: "See all",
				seeAllLink: ["/browse"],
				seeAllQueryParams: { sort: "new" }
			});

			expect(root(fixture).querySelector("a")?.getAttribute("href")).toBe(
				"/browse?sort=new"
			);
			expect(root(fixture).querySelector("a")?.textContent).toContain(
				"See all"
			);
		});

		it("renders a button that emits seeAll when there is no link", () => {
			const fixture = render({ seeAllLabel: "See all" });
			const seen = vi.fn();
			fixture.componentInstance.seeAll.subscribe(seen);

			const button = Array.from(
				root(fixture).querySelectorAll("button")
			).find(b =>
				b.textContent?.includes("See all")
			) as HTMLButtonElement;
			button.click();

			expect(seen).toHaveBeenCalledOnce();
		});
	});

	describe("scroll controls", () => {
		function renderScrolled(geometry: Parameters<typeof setGeometry>[1]) {
			const fixture = render();
			setGeometry(scroller(fixture), geometry);
			resizeCallback?.();
			fixture.detectChanges();
			return fixture;
		}

		it("disables the back button at the start", () => {
			const fixture = renderScrolled({
				scrollLeft: 0,
				scrollWidth: 1000,
				clientWidth: 400
			});

			expect(scrollButton(fixture, "back").disabled).toBe(true);
			expect(scrollButton(fixture, "forward").disabled).toBe(false);
		});

		it("enables both buttons in the middle", () => {
			const fixture = renderScrolled({
				scrollLeft: 300,
				scrollWidth: 1000,
				clientWidth: 400
			});

			expect(scrollButton(fixture, "back").disabled).toBe(false);
			expect(scrollButton(fixture, "forward").disabled).toBe(false);
		});

		it("disables the forward button at the end within tolerance", () => {
			const fixture = renderScrolled({
				scrollLeft: 597,
				scrollWidth: 1000,
				clientWidth: 400
			});

			expect(scrollButton(fixture, "forward").disabled).toBe(true);
		});

		it("disables both buttons when the content fits", () => {
			const fixture = renderScrolled({
				scrollLeft: 0,
				scrollWidth: 400,
				clientWidth: 400
			});

			expect(scrollButton(fixture, "back").disabled).toBe(true);
			expect(scrollButton(fixture, "forward").disabled).toBe(true);
		});

		it("updates the edges on scroll", () => {
			const fixture = render();
			const element = scroller(fixture);
			setGeometry(element, {
				scrollLeft: 300,
				scrollWidth: 1000,
				clientWidth: 400
			});

			element.dispatchEvent(new Event("scroll"));
			fixture.detectChanges();

			expect(scrollButton(fixture, "back").disabled).toBe(false);
		});

		it("scrolls 80% of the visible width smoothly", () => {
			const fixture = renderScrolled({
				scrollLeft: 300,
				scrollWidth: 1000,
				clientWidth: 400
			});

			scrollButton(fixture, "forward").click();
			scrollButton(fixture, "back").click();

			expect(scrollBy).toHaveBeenNthCalledWith(1, {
				left: 320,
				behavior: "smooth"
			});
			expect(scrollBy).toHaveBeenNthCalledWith(2, {
				left: -320,
				behavior: "smooth"
			});
		});
	});
});
