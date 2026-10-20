import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { type BacklogEntry, type BacklogStatus } from "../../../core/models";
import { BacklogEntryCard } from "./backlog-entry-card";

function entryWithStatus(status: BacklogStatus): BacklogEntry {
	return {
		id: "entry-1",
		status,
		isPublic: true,
		game: { id: "game-1", code: "hades", title: "Hades", isDlc: false },
		platform: { id: "platform-1", abbreviation: "PC" }
	};
}

const POSTER_COMPLETE_SELECTOR = 'button[aria-label="Mark as completed"]';
const POSTER_PLAY_SELECTOR = 'button[aria-label="Start playing"]';

function mobileBarButton(
	element: HTMLElement,
	label: string
): HTMLButtonElement | undefined {
	return Array.from(element.querySelectorAll("button")).find(button =>
		button.textContent?.includes(label)
	);
}

describe("BacklogEntryCard quick status actions", () => {
	function render(status: BacklogStatus, readonly = false) {
		const fixture = TestBed.createComponent(BacklogEntryCard);
		fixture.componentRef.setInput("entry", entryWithStatus(status));
		fixture.componentRef.setInput("readonly", readonly);
		fixture.detectChanges();
		return fixture;
	}

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [BacklogEntryCard],
			providers: [provideRouter([])]
		});
	});

	it("offers the complete action on the poster and in the mobile bar for a playing entry", () => {
		const element = render("playing").nativeElement as HTMLElement;

		expect(element.querySelector(POSTER_COMPLETE_SELECTOR)).not.toBeNull();
		expect(mobileBarButton(element, "Complete")).toBeDefined();
	});

	it("emits completeRequested from both complete actions", () => {
		const fixture = render("playing");
		const element = fixture.nativeElement as HTMLElement;
		const emitted: Event[] = [];
		fixture.componentInstance.completeRequested.subscribe(event =>
			emitted.push(event)
		);

		element
			.querySelector<HTMLButtonElement>(POSTER_COMPLETE_SELECTOR)
			?.click();
		mobileBarButton(element, "Complete")?.click();

		expect(emitted.length).toBe(2);
	});

	it("keeps the start playing action for a not started entry", () => {
		const fixture = render("not_started");
		const element = fixture.nativeElement as HTMLElement;

		expect(element.querySelector(POSTER_PLAY_SELECTOR)).not.toBeNull();
		expect(element.querySelector(POSTER_COMPLETE_SELECTOR)).toBeNull();
	});

	it("hides every quick status action in readonly mode", () => {
		const element = render("playing", true).nativeElement as HTMLElement;

		expect(element.querySelector(POSTER_COMPLETE_SELECTOR)).toBeNull();
		expect(element.textContent).not.toContain("Complete");
	});

	it("does not offer the complete action for a completed entry", () => {
		const element = render("completed").nativeElement as HTMLElement;

		expect(element.querySelector(POSTER_COMPLETE_SELECTOR)).toBeNull();
	});
});
