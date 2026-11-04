import { TestBed } from "@angular/core/testing";

import { OnlineSourceNote } from "./online-source-note";

describe("OnlineSourceNote", () => {
	it("announces that RAWG is down and IGDB answered", () => {
		const fixture = TestBed.createComponent(OnlineSourceNote);
		fixture.detectChanges();

		const note = (fixture.nativeElement as HTMLElement).querySelector(
			'p[role="status"]'
		);
		expect(note?.textContent).toContain(
			"RAWG is down, showing results from IGDB"
		);
	});
});
