import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { ListCard, type ListCardList } from "./list-card";

const baseList: ListCardList = { id: "l1", name: "Best RPGs" };

function previewItem(id: string, withGame = true) {
	return {
		id,
		game: withGame ? { id: `g-${id}`, code: id, title: `Game ${id}` } : null
	};
}

describe("ListCard", () => {
	function render(list: ListCardList, inputs: Record<string, unknown> = {}) {
		const fixture = TestBed.createComponent(ListCard);
		fixture.componentRef.setInput("list", list);
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [ListCard],
			providers: [provideRouter([])]
		});
	});

	it("links to the list and shows its name", () => {
		const element = render(baseList);

		expect(element.querySelector("a")?.getAttribute("href")).toBe(
			"/lists/l1"
		);
		expect(element.querySelector("h3")?.textContent?.trim()).toBe(
			"Best RPGs"
		);
	});

	it("adds the provided query params to the link", () => {
		const element = render(baseList, { linkQueryParams: { from: "me" } });

		expect(element.querySelector("a")?.getAttribute("href")).toBe(
			"/lists/l1?from=me"
		);
	});

	it("shows the description only when there is one", () => {
		expect(render(baseList).querySelector("p")).toBeNull();
		expect(
			render({ ...baseList, description: "Top picks" }).textContent
		).toContain("Top picks");
	});

	it("credits the owner of a non official list", () => {
		const element = render({ ...baseList, owner: { username: "ada" } });

		expect(element.textContent).toContain("by @ada");
	});

	it("shows the Official badge instead of the owner for official lists", () => {
		const element = render({
			...baseList,
			isOfficial: true,
			owner: { username: "ada" }
		});

		expect(element.textContent).toContain("Official");
		expect(element.textContent).not.toContain("by @ada");
	});

	it("shows a placeholder icon when there are no preview games", () => {
		const element = render({
			...baseList,
			previewItems: [previewItem("a", false)]
		});

		expect(element.querySelector("app-game-poster")).toBeNull();
		expect(element.textContent).toContain("format_list_bulleted");
	});

	it("builds a collage of at most four preview games skipping removed ones", () => {
		const element = render({
			...baseList,
			previewItems: [
				previewItem("a"),
				previewItem("b", false),
				previewItem("c"),
				previewItem("d"),
				previewItem("e"),
				previewItem("f")
			]
		});

		expect(element.querySelectorAll("app-game-poster")).toHaveLength(4);
		expect(element.textContent).not.toContain("format_list_bulleted");
	});

	describe("visibility badge", () => {
		it("is hidden by default", () => {
			const element = render({ ...baseList, isPublic: true });

			expect(element.textContent).not.toContain("Public");
		});

		it("shows Public or Private when enabled", () => {
			expect(
				render(
					{ ...baseList, isPublic: true },
					{ showVisibility: true }
				).textContent
			).toContain("Public");
			expect(
				render(
					{ ...baseList, isPublic: false },
					{ showVisibility: true }
				).textContent
			).toContain("Private");
		});

		it("is omitted when the list has no visibility information", () => {
			const element = render(baseList, { showVisibility: true });

			expect(element.textContent).not.toMatch(/Public|Private/);
		});
	});

	describe("progress", () => {
		it("shows completed over total games", () => {
			const element = render({
				...baseList,
				progress: { completed: 3, total: 10 }
			});

			expect(element.textContent).toContain("3/10");
			expect(element.textContent).not.toContain("Completed");
		});

		it("flags a fully completed list", () => {
			const element = render({
				...baseList,
				progress: { completed: 5, total: 5 }
			});

			expect(element.textContent).toContain("Completed");
		});

		it("rounds to a whole percent before checking for completion", () => {
			const element = render({
				...baseList,
				progress: { completed: 999, total: 1000 }
			});

			expect(element.textContent).toContain("Completed");
		});

		it("hides progress for an empty list or missing progress", () => {
			expect(
				render({ ...baseList, progress: { completed: 0, total: 0 } })
					.textContent
			).not.toContain("0/0");
			expect(
				render({ ...baseList, progress: null }).querySelector(
					"ui-progress"
				)
			).toBeNull();
		});
	});
});
