import "@testing-library/jest-dom/vitest";

import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { type BacklogEntry, type BacklogStatus } from "../../../core/models";
import { PointerService } from "../../../core/services/pointer";
import { ViewportService } from "../../../core/services/viewport";
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

const DEVICE_PROVIDERS = [
	{ provide: ViewportService, useValue: { isMobile: signal(false) } },
	{ provide: PointerService, useValue: { isCoarse: signal(false) } }
];

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
			providers: [provideRouter([]), ...DEVICE_PROVIDERS]
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
			providers: [provideRouter([]), ...DEVICE_PROVIDERS]
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
	function render() {
		const fixture = TestBed.createComponent(BacklogEntryCard);
		fixture.componentRef.setInput("entry", {
			...entryWithStatus("playing"),
			game: {
				...entryWithStatus("playing").game,
				backgroundUrl: "https://media.rawg.io/media/games/abc/hades.jpg"
			}
		});
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [BacklogEntryCard],
			providers: [provideRouter([]), ...DEVICE_PROVIDERS]
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

		expect(element.className).toContain("[content-visibility:auto]");
		expect(element.className).toContain(
			"[contain-intrinsic-size:auto_180px]"
		);
	});
});

@Component({
	imports: [BacklogEntryCard],
	template: `<app-backlog-entry-card
		[entry]="entry()"
		[statusUpdating]="updating()"
		(statusChanged)="changes.push($event)"
		(opened)="opened = opened + 1"
	/>`
})
class CardHost {
	readonly entry = signal(entryWithStatus("playing"));
	readonly updating = signal(false);
	readonly changes: BacklogStatus[] = [];
	opened = 0;
}

describe("BacklogEntryCard status picker", () => {
	const isMobile = signal(false);

	beforeEach(() => {
		isMobile.set(false);
		TestBed.configureTestingModule({
			imports: [CardHost],
			providers: [
				provideRouter([]),
				{ provide: ViewportService, useValue: { isMobile } },
				{
					provide: PointerService,
					useValue: { isCoarse: signal(false) }
				}
			]
		});
	});

	afterEach(() => {
		document.body.innerHTML = "";
	});

	function render(status: BacklogStatus = "playing") {
		const fixture = TestBed.createComponent(CardHost);
		fixture.componentInstance.entry.set(entryWithStatus(status));
		fixture.autoDetectChanges();
		document.body.appendChild(fixture.nativeElement);
		return { fixture, host: fixture.componentInstance };
	}

	function trigger(status = "Playing") {
		return screen.getByRole("button", {
			name: `Status of Hades: ${status}`
		});
	}

	it.each<[BacklogStatus, boolean]>([
		["not_started", true],
		["playing", true],
		["endless", true],
		["completed", false],
		["abandoned", false]
	])("lets the user change a %s entry: %s", (status, changeable) => {
		render(status);

		expect(
			screen.queryByRole("button", { name: /^Status of Hades/ }) !== null
		).toBe(changeable);
		expect(
			document.querySelector("app-backlog-status-badge")
		).not.toBeNull();
	});

	it("shows only the badge on a readonly card", () => {
		const card = TestBed.createComponent(BacklogEntryCard);
		card.componentRef.setInput("entry", entryWithStatus("playing"));
		card.componentRef.setInput("readonly", true);
		card.detectChanges();
		const element = card.nativeElement as HTMLElement;

		expect(element.querySelector("app-backlog-status-picker")).toBeNull();
		expect(
			element.querySelector("app-backlog-status-badge")
		).not.toBeNull();
	});

	it("emits the chosen status from the menu without opening the entry", async () => {
		const user = userEvent.setup();
		const { host } = render();

		await user.click(trigger());
		const menu = await screen.findByRole("menu", { name: "Change status" });
		await user.click(
			within(menu).getByRole("menuitemradio", { name: /Completed/ })
		);

		expect(host.changes).toEqual(["completed"]);
		expect(host.opened).toBe(0);
	});

	it("keeps the keys pressed inside the menu from opening the entry", async () => {
		const user = userEvent.setup();
		const { host } = render();

		trigger().focus();
		await user.keyboard("{Enter}");
		await screen.findByRole("menu");
		const openedWithMenuOpen = host.opened;
		await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

		expect(host.changes).toHaveLength(1);
		expect(host.opened).toBe(openedWithMenuOpen);
	});

	it("closes with Escape, returns the focus to the badge and keeps the status", async () => {
		const user = userEvent.setup();
		const { host } = render();

		await user.click(trigger());
		await screen.findByRole("menu");
		await user.keyboard("{Escape}");

		await waitFor(() =>
			expect(screen.queryByRole("menu")).not.toBeInTheDocument()
		);
		await waitFor(() => expect(trigger()).toHaveFocus());
		expect(host.changes).toEqual([]);
		expect(host.opened).toBe(0);
	});

	it("emits once when an option is double clicked", async () => {
		const user = userEvent.setup();
		const { host } = render("not_started");

		await user.click(trigger("Not Started"));
		await user.dblClick(
			within(await screen.findByRole("menu")).getByRole("menuitemradio", {
				name: /Playing/
			})
		);

		expect(host.changes).toEqual(["playing"]);
	});

	it("keeps the card rendered normally while its menu is open, since the menu lives outside it", async () => {
		const user = userEvent.setup();
		const { fixture } = render();

		await user.click(trigger());
		const menu = await screen.findByRole("menu");
		const card = fixture.nativeElement.querySelector(
			"app-backlog-entry-card"
		) as HTMLElement;

		expect(card.contains(menu)).toBe(false);
		expect(card.className).toContain("[content-visibility:auto]");
	});

	it("opens a sheet on mobile and ignores taps once the save started", async () => {
		isMobile.set(true);
		const user = userEvent.setup();
		const { host } = render();

		await user.click(trigger());
		const sheet = await screen.findByRole("dialog", {
			name: "Change status"
		});
		host.updating.set(true);
		await user.click(
			within(sheet).getByRole("button", { name: /Endless/ })
		);

		expect(host.changes).toEqual([]);
		expect(host.opened).toBe(0);
	});

	it("disables the badge while the status is saving", () => {
		const { host } = render();
		host.updating.set(true);
		TestBed.tick();

		expect(trigger()).toBeDisabled();
	});
});
