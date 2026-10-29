import { TestBed } from "@angular/core/testing";

import { type RewindPersonaCode } from "../../../../core/models/rewind.model";
import {
	RewindPersonaRank,
	type RewindPersonaRankSize
} from "./rewind-persona-rank";

describe("RewindPersonaRank", () => {
	function render(code: string, size: RewindPersonaRankSize = "hero") {
		const fixture = TestBed.createComponent(RewindPersonaRank);
		fixture.componentRef.setInput("code", code as RewindPersonaCode);
		fixture.componentRef.setInput("size", size);
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	it("shows the title and the phrase in the hero, with a decorative badge", () => {
		const element = render("marathoner");

		expect(element.textContent).toContain("Marathoner");
		expect(element.textContent).toContain(
			"Long games, long nights, no shortcuts."
		);
		const badge = element.querySelector(".material-icons")!;
		expect(badge.closest("[aria-hidden='true']")).not.toBeNull();
	});

	it.each<RewindPersonaRankSize>(["compact", "mini"])(
		"shows only the title in the %s size",
		size => {
			const element = render("genre-explorer", size);

			expect(element.textContent).toContain("Genre Explorer");
			expect(element.textContent).not.toContain("No genre was safe");
		}
	);

	it("falls back to Steady Player when the API sends an unknown persona", () => {
		expect(render("speedrunner").textContent).toContain("Steady Player");
	});

	it("speaks the language it receives and stays in English by default", () => {
		const fixture = TestBed.createComponent(RewindPersonaRank);
		fixture.componentRef.setInput("code", "trophy-hunter");
		fixture.detectChanges();
		const element = fixture.nativeElement as HTMLElement;
		expect(element.textContent).toContain("Trophy Hunter");

		fixture.componentRef.setInput("language", "es");
		fixture.detectChanges();

		expect(element.textContent).toContain("Cazatrofeos");
		expect(element.textContent).not.toContain("Trophy Hunter");
	});
});
