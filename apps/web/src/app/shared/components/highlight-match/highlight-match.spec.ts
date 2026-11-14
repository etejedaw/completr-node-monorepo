import { TestBed } from "@angular/core/testing";

import { HighlightMatch, splitAroundMatch } from "./highlight-match";

describe("splitAroundMatch", () => {
	it("splits the text around the first case-insensitive match", () => {
		expect(splitAroundMatch("Castlevania: Symphony", "castle")).toEqual({
			before: "",
			match: "Castle",
			after: "vania: Symphony"
		});
	});

	it("matches in the middle of the text and trims the query", () => {
		expect(
			splitAroundMatch("Every Castlevania ranked", "  vania ")
		).toEqual({
			before: "Every Castle",
			match: "vania",
			after: " ranked"
		});
	});

	it("returns the whole text unmarked when nothing matches", () => {
		expect(splitAroundMatch("Hades", "zelda")).toEqual({
			before: "Hades",
			match: "",
			after: ""
		});
	});

	it("returns the whole text unmarked for a blank query", () => {
		expect(splitAroundMatch("Hades", "   ")).toEqual({
			before: "Hades",
			match: "",
			after: ""
		});
	});
});

describe("HighlightMatch", () => {
	function render(text: string, query: string) {
		const fixture = TestBed.createComponent(HighlightMatch);
		fixture.componentRef.setInput("text", text);
		fixture.componentRef.setInput("query", query);
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	it("marks the matching part and keeps the full text", () => {
		const element = render("Castle Crashers", "crash");

		expect(element.textContent).toBe("Castle Crashers");
		expect(element.querySelector("mark")?.textContent).toBe("Crash");
	});

	it("renders no mark when the query does not match", () => {
		const element = render("Hades", "zelda");

		expect(element.textContent).toBe("Hades");
		expect(element.querySelector("mark")).toBeNull();
	});
});
