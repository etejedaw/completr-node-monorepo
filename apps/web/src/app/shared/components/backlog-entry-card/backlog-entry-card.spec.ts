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

describe("BacklogEntryCard accessible name", () => {
	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [BacklogEntryCard],
			providers: [provideRouter([])]
		});
	});

	function card(readonly: boolean) {
		const fixture = TestBed.createComponent(BacklogEntryCard);
		fixture.componentRef.setInput("entry", entryWithStatus("playing"));
		fixture.componentRef.setInput("readonly", readonly);
		fixture.detectChanges();
		return (fixture.nativeElement as HTMLElement).querySelector(
			"article"
		) as HTMLElement;
	}

	it("labels the interactive card with title and status and describes it with its details", () => {
		const article = card(false);
		const details = document.getElementById(
			article.getAttribute("aria-describedby")!
		);

		expect(article.getAttribute("aria-label")).toBe("Hades, Playing");
		expect(article.contains(details)).toBe(true);
	});

	it("leaves the readonly card without a button name", () => {
		const article = card(true);

		expect(article.hasAttribute("aria-label")).toBe(false);
		expect(article.hasAttribute("aria-describedby")).toBe(false);
	});
});

describe("BacklogEntryCard rendering cost", () => {
	function render(statusMenuOpen = false) {
		const fixture = TestBed.createComponent(BacklogEntryCard);
		fixture.componentRef.setInput("entry", {
			...entryWithStatus("playing"),
			game: {
				...entryWithStatus("playing").game,
				backgroundUrl: "https://media.rawg.io/media/games/abc/hades.jpg"
			}
		});
		fixture.componentRef.setInput("statusMenuOpen", statusMenuOpen);
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [BacklogEntryCard],
			providers: [provideRouter([])]
		});
	});

	it("requests the same image URL for the blurred background and the poster", () => {
		const element = render();
		const sources = Array.from(element.querySelectorAll("img")).map(image =>
			image.getAttribute("src")
		);
		const posterSource = element
			.querySelector("a img")
			?.getAttribute("src");

		expect(posterSource).toBeTruthy();
		expect(sources.filter(source => source === posterSource).length).toBe(
			3
		);
	});

	it("skips rendering off-screen cards with content-visibility and an intrinsic size", () => {
		const element = render();

		expect(element.style.contentVisibility).toBe("auto");
		expect(element.className).toContain(
			"[contain-intrinsic-size:auto_180px]"
		);
	});

	it("keeps the card fully rendered while the status menu is open", () => {
		const element = render(true);

		expect(element.style.contentVisibility).toBe("visible");
	});
});
