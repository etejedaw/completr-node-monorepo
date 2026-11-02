import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { GameFeaturedLists } from "./game-featured-lists";
import { type FeaturedList } from "./game-featured-lists.model";

const list = (overrides: Partial<FeaturedList>): FeaturedList => ({
	id: "l1",
	name: "Cozy games",
	isOfficial: false,
	completed: false,
	owner: { username: "ada" },
	...overrides
});

describe("GameFeaturedLists", () => {
	function render(lists: FeaturedList[]) {
		const fixture = TestBed.createComponent(GameFeaturedLists);
		fixture.componentRef.setInput("lists", lists);
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [GameFeaturedLists],
			providers: [provideRouter([])]
		});
	});

	it("links each list to its detail page", () => {
		const element = render([list({ id: "abc" })]);

		expect(element.querySelector("a")?.getAttribute("href")).toBe(
			"/lists/abc"
		);
	});

	it("puts official lists first and keeps the rest in order", () => {
		const element = render([
			list({ id: "1", name: "First" }),
			list({ id: "2", name: "Official", isOfficial: true }),
			list({ id: "3", name: "Third" })
		]);

		const names = Array.from(element.querySelectorAll("li a")).map(a =>
			a.querySelector("span.truncate")?.textContent?.trim()
		);
		expect(names).toEqual(["Official", "First", "Third"]);
	});

	it("does not mutate the input array when sorting", () => {
		const lists = [list({ id: "1" }), list({ id: "2", isOfficial: true })];

		render(lists);

		expect(lists.map(l => l.id)).toEqual(["1", "2"]);
	});

	it("shows the Official badge only on official lists", () => {
		const official = render([list({ isOfficial: true })]);
		const regular = render([list({ isOfficial: false })]);

		expect(official.textContent).toContain("Official");
		expect(regular.textContent).not.toContain("Official");
	});

	it("shows the description, the owner and the completion mark when present", () => {
		const element = render([
			list({ description: "Relaxing picks", completed: true })
		]);

		expect(element.textContent).toContain("Relaxing picks");
		expect(element.textContent).toContain("by @ada");
		expect(element.textContent).toContain("You completed it");
	});

	it("omits the optional parts when they are missing", () => {
		const element = render([list({ owner: null })]);

		expect(element.textContent).not.toContain("by @");
		expect(element.textContent).not.toContain("You completed it");
		expect(element.querySelector("span.line-clamp-2")).toBeNull();
	});
});
