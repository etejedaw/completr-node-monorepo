import { TestBed } from "@angular/core/testing";

import { type ReleaseTint, type ReleaseView } from "../release.model";
import { ReleaseEntryCard } from "./release-entry";

function release(tint: ReleaseTint): ReleaseView {
	return {
		date: "2026-10-18",
		tag: "v1.2.0",
		title: "Quicker flows",
		icon: "bolt",
		tint,
		anchor: "release-2026-10-18-1",
		highlights: [{ icon: "bolt", tint, text: "Move games to the top" }]
	};
}

function render(variant: "featured" | "timeline", tint: ReleaseTint) {
	const fixture = TestBed.createComponent(ReleaseEntryCard);
	fixture.componentRef.setInput("release", release(tint));
	fixture.componentRef.setInput("variant", variant);
	fixture.detectChanges();
	return fixture.nativeElement as HTMLElement;
}

describe("ReleaseEntryCard", () => {
	it("marks the featured release as Latest and shows its tag as a badge", () => {
		const badges = Array.from(
			render("featured", "success").querySelectorAll("ui-badge")
		).map(badge => badge.textContent?.trim());

		expect(badges).toEqual(["Latest", "v1.2.0"]);
	});

	it("keeps the purple tint on the tag badge", () => {
		const tag = render("featured", "purple").querySelectorAll(
			"ui-badge"
		)[1];

		expect(tag.className).toContain("!text-nav-saved-views");
	});

	it("uses the matching badge tone for the other tints", () => {
		const tag = render("featured", "danger").querySelectorAll(
			"ui-badge"
		)[1];

		expect(tag.className).toContain("text-danger");
		expect(tag.className).not.toContain("nav-saved-views");
	});

	it("shows no badges in the timeline variant", () => {
		expect(
			render("timeline", "brand").querySelectorAll("ui-badge")
		).toHaveLength(0);
	});
});
