import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { type BacklogEntry, type BacklogStatus } from "../../../core/models";
import { BACKLOG_STATUS_FILTERS } from "../../utils/backlog-status";
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

@Component({
	imports: [BacklogEntryCard],
	template: `<app-backlog-entry-card
			[entry]="entry()"
			[statusMenuOpen]="menuOpen()"
			[statusOptions]="options"
			(statusMenuToggled)="menuOpen.set(!menuOpen())"
			(statusMenuClosed)="menuOpen.set(false)"
			(opened)="opened = opened + 1"
		/>
		<button type="button" id="outside">Outside</button>`
})
class CardHost {
	readonly entry = signal(entryWithStatus("playing"));
	readonly menuOpen = signal(false);
	readonly options = BACKLOG_STATUS_FILTERS.map(filter => ({ ...filter }));
	opened = 0;
}

describe("BacklogEntryCard status menu keyboard", () => {
	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [CardHost],
			providers: [provideRouter([])]
		});
	});

	function render(status: BacklogStatus = "playing") {
		const fixture = TestBed.createComponent(CardHost);
		fixture.componentInstance.entry.set(entryWithStatus(status));
		fixture.detectChanges();
		const element = fixture.nativeElement as HTMLElement;
		const trigger = element.querySelector<HTMLButtonElement>(
			"button[aria-haspopup='menu']"
		)!;
		return {
			fixture,
			host: fixture.componentInstance,
			element,
			trigger,
			outside: element.querySelector<HTMLElement>("#outside")!,
			menu: () => element.querySelector("[role='menu']"),
			items: () =>
				Array.from(
					element.querySelectorAll<HTMLButtonElement>(
						"[role='menuitem']"
					)
				)
		};
	}

	async function openMenu(view: ReturnType<typeof render>) {
		view.trigger.click();
		view.fixture.detectChanges();
		await view.fixture.whenStable();
	}

	function press(
		target: EventTarget,
		key: string,
		init: KeyboardEventInit = {}
	) {
		const event = new KeyboardEvent("keydown", {
			key,
			bubbles: true,
			cancelable: true,
			...init
		});
		target.dispatchEvent(event);
		return event;
	}

	function focused() {
		return Array.from(document.activeElement?.childNodes ?? [])
			.filter(node => node.nodeType === Node.TEXT_NODE)
			.map(node => node.textContent)
			.join("")
			.trim();
	}

	it("moves the focus to the first enabled option when the menu opens", async () => {
		const view = render("playing");

		await openMenu(view);

		expect(view.menu()).not.toBeNull();
		expect(focused()).toBe("Not Started");
	});

	it("skips the current status when it is the first option", async () => {
		const view = render("not_started");

		await openMenu(view);

		expect(focused()).toBe("Playing");
	});

	it("closes with Escape while the focus is on the trigger and keeps it there", async () => {
		const view = render();
		await openMenu(view);
		view.trigger.focus();

		press(view.trigger, "Escape");
		view.fixture.detectChanges();

		expect(view.menu()).toBeNull();
		expect(document.activeElement).toBe(view.trigger);
	});

	it("closes with Escape from inside the menu and returns the focus to the trigger", async () => {
		const view = render();
		await openMenu(view);

		press(view.items()[0], "Escape");
		view.fixture.detectChanges();

		expect(view.menu()).toBeNull();
		expect(document.activeElement).toBe(view.trigger);
	});

	it("closes with Escape pressed elsewhere on the page and returns the focus to the trigger", async () => {
		const view = render();
		await openMenu(view);
		view.outside.focus();

		press(view.outside, "Escape");
		view.fixture.detectChanges();

		expect(view.menu()).toBeNull();
		expect(document.activeElement).toBe(view.trigger);
	});

	it("walks the enabled options with the arrows, skipping the current status and wrapping around", async () => {
		const view = render("playing");
		await openMenu(view);

		const down = ["ArrowDown", "ArrowDown", "ArrowDown", "ArrowDown"].map(
			key => {
				press(document.activeElement!, key);
				return focused();
			}
		);
		const up = ["ArrowUp", "ArrowUp"].map(key => {
			press(document.activeElement!, key);
			return focused();
		});

		expect(down).toEqual([
			"Completed",
			"Endless",
			"Abandoned",
			"Not Started"
		]);
		expect(up).toEqual(["Abandoned", "Endless"]);
	});

	it("jumps to the first and last enabled options with Home and End", async () => {
		const view = render("playing");
		await openMenu(view);

		press(document.activeElement!, "End");
		expect(focused()).toBe("Abandoned");

		press(document.activeElement!, "Home");
		expect(focused()).toBe("Not Started");
	});

	it("closes on Tab without trapping the focus", async () => {
		const view = render();
		await openMenu(view);

		const event = press(document.activeElement!, "Tab");
		view.fixture.detectChanges();

		expect(view.menu()).toBeNull();
		expect(event.defaultPrevented).toBe(false);
	});

	it("keeps Enter and Space on the menu from opening the entry", async () => {
		const view = render();
		await openMenu(view);
		const openedBefore = view.host.opened;

		const enter = press(view.items()[0], "Enter");
		const space = press(view.items()[0], " ");

		expect(view.host.opened).toBe(openedBefore);
		expect(space.defaultPrevented).toBe(false);
		expect(enter.defaultPrevented).toBe(false);
	});

	it("emits the chosen status when an option is clicked", async () => {
		const view = render();
		await openMenu(view);
		const selections: string[] = [];
		const card = view.fixture.debugElement.children[0].componentInstance;
		card.statusSelected.subscribe((selection: { status: string }) =>
			selections.push(selection.status)
		);

		view.items()[2].click();

		expect(selections).toEqual(["completed"]);
	});
});
