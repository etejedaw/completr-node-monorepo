import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { type FranchiseSummary } from "../../franchises";
import { FranchiseCard } from "./franchise-card";

const residentEvil: FranchiseSummary = {
	id: "f1",
	name: "Resident Evil",
	code: "resident-evil",
	description: "Survival horror saga by Capcom.",
	gameCount: 8,
	isTracked: false,
	previewGames: [
		{ id: "g1", code: "re1", title: "Resident Evil", backgroundUrl: null },
		{ id: "g2", code: "re2", title: "Resident Evil 2", backgroundUrl: null }
	]
};

function renderCard(
	franchise: FranchiseSummary,
	state: { tracked?: boolean; pending?: boolean } = {}
) {
	TestBed.configureTestingModule({ providers: [provideRouter([])] });
	const fixture = TestBed.createComponent(FranchiseCard);
	fixture.componentRef.setInput("franchise", franchise);
	fixture.componentRef.setInput("tracked", state.tracked ?? false);
	fixture.componentRef.setInput("pending", state.pending ?? false);
	fixture.detectChanges();
	return fixture;
}

describe("FranchiseCard", () => {
	it("links the saga name to its page and shows its game count", () => {
		const element: HTMLElement = renderCard(residentEvil).nativeElement;

		const link = element.querySelector("h3 a")!;
		expect(link.textContent?.trim()).toBe("Resident Evil");
		expect(link.getAttribute("href")).toBe("/franchises/resident-evil");
		expect(element.textContent).toContain("8 games");
		expect(element.textContent).toContain(
			"Survival horror saga by Capcom."
		);
	});

	it("uses the singular for a single game and hides a missing description", () => {
		const element: HTMLElement = renderCard({
			...residentEvil,
			gameCount: 1,
			description: null
		}).nativeElement;

		expect(element.textContent).toContain("1 game");
		expect(element.textContent).not.toContain("1 games");
		expect(element.querySelectorAll("h3 ~ p")).toHaveLength(0);
	});

	it("shows no personal progress", () => {
		const element: HTMLElement = renderCard(residentEvil).nativeElement;

		expect(element.querySelector("ui-progress")).toBeNull();
		expect(element.textContent).not.toMatch(/\d+\/\d+/);
	});

	it("names the track button after the saga and reflects the tracked state", () => {
		const untracked: HTMLElement = renderCard(residentEvil).nativeElement;
		const button = untracked.querySelector("button")!;
		expect(button.textContent?.replace(/\s+/g, " ").trim()).toBe(
			"add Track Resident Evil"
		);
		expect(button.getAttribute("aria-pressed")).toBe("false");

		TestBed.resetTestingModule();
		const tracked: HTMLElement = renderCard(residentEvil, {
			tracked: true
		}).nativeElement;
		expect(
			tracked.querySelector("button")!.getAttribute("aria-pressed")
		).toBe("true");
		expect(tracked.querySelector("button")!.textContent).toContain(
			"Tracking"
		);
	});

	it("disables the button and marks it busy while a request is pending", () => {
		const element: HTMLElement = renderCard(residentEvil, {
			pending: true
		}).nativeElement;
		const button = element.querySelector("button")!;

		expect(button.disabled).toBe(true);
		expect(button.getAttribute("aria-busy")).toBe("true");
	});

	it("emits trackToggled when the button is clicked", () => {
		const fixture = renderCard(residentEvil);
		const toggled = vi.fn();
		fixture.componentInstance.trackToggled.subscribe(toggled);

		(fixture.nativeElement as HTMLElement).querySelector("button")!.click();

		expect(toggled).toHaveBeenCalledTimes(1);
	});

	it("falls back to an icon when the saga has no games to preview", () => {
		const element: HTMLElement = renderCard({
			...residentEvil,
			previewGames: []
		}).nativeElement;

		expect(element.querySelector("app-game-poster")).toBeNull();
		expect(element.textContent).toContain("collections_bookmark");
	});
});
