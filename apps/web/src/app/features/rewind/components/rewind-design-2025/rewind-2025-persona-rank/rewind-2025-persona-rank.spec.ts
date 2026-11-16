import { TestBed } from "@angular/core/testing";

import { type RewindPersonaCode } from "../../../../../core/models/rewind.model";
import { Rewind2025PersonaRank } from "./rewind-2025-persona-rank";

describe("Rewind2025PersonaRank", () => {
	function render(code: string) {
		const fixture = TestBed.createComponent(Rewind2025PersonaRank);
		fixture.componentRef.setInput("code", code as RewindPersonaCode);
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	it("shows the title and the phrase with a decorative badge", () => {
		const element = render("marathoner");

		expect(element.textContent).toContain("Marathoner");
		expect(element.textContent).toContain(
			"Long games, long nights, no shortcuts."
		);
		const badge = element.querySelector(".material-icons")!;
		expect(badge.closest("[aria-hidden='true']")).not.toBeNull();
	});

	it("falls back to Steady Player when the API sends an unknown persona", () => {
		expect(render("speedrunner").textContent).toContain("Steady Player");
	});

	it("falls back to Steady Player when the API sends garbage", () => {
		expect(render("").textContent).toContain("Steady Player");
		expect(render("<script>").textContent).toContain("Steady Player");
	});

	it("speaks the language it receives and stays in English by default", () => {
		const fixture = TestBed.createComponent(Rewind2025PersonaRank);
		fixture.componentRef.setInput("code", "trophy-hunter");
		fixture.detectChanges();
		const element = fixture.nativeElement as HTMLElement;
		expect(element.textContent).toContain("Trophy Hunter");

		fixture.componentRef.setInput("language", "es");
		fixture.detectChanges();

		expect(element.textContent).toContain("Cazatrofeos");
		expect(element.textContent).not.toContain("Trophy Hunter");
	});

	it("follows a persona that changes several times in a row", () => {
		const fixture = TestBed.createComponent(Rewind2025PersonaRank);
		const element = fixture.nativeElement as HTMLElement;
		for (const code of ["marathoner", "trophy-hunter", "genre-explorer"]) {
			fixture.componentRef.setInput("code", code as RewindPersonaCode);
			fixture.detectChanges();
		}

		expect(element.textContent).toContain("Genre Explorer");
		expect(element.textContent).not.toContain("Trophy Hunter");
	});
});
