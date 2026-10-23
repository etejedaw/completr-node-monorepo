import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { MenuKeyboard } from "./menu-keyboard";

@Component({
	imports: [MenuKeyboard],
	template: `<div [appMenuKeyboard]="open" (menuClosed)="close()">
			<button type="button" aria-haspopup="menu" (click)="open = !open">
				Status
			</button>
			@if (open) {
				<div role="menu">
					@for (item of items; track item) {
						<button
							type="button"
							role="menuitem"
							[disabled]="item === current"
						>
							{{ item }}
						</button>
					}
				</div>
			}
		</div>
		<button type="button" id="outside">Outside</button>`
})
class Host {
	open = false;
	current = "Playing";
	items = ["Not started", "Playing", "Completed", "Abandoned"];
	closures = 0;

	close() {
		this.open = false;
		this.closures++;
	}
}

function press(target: EventTarget, key: string, init: KeyboardEventInit = {}) {
	const event = new KeyboardEvent("keydown", {
		key,
		bubbles: true,
		cancelable: true,
		...init
	});
	target.dispatchEvent(event);
	return event;
}

describe("MenuKeyboard", () => {
	function render(open = false) {
		const fixture = TestBed.createComponent(Host);
		fixture.componentInstance.open = open;
		fixture.detectChanges();
		const element = fixture.nativeElement as HTMLElement;
		return {
			fixture,
			host: fixture.componentInstance,
			element,
			trigger: element.querySelector<HTMLElement>(
				"[aria-haspopup='menu']"
			)!,
			outside: element.querySelector<HTMLElement>("#outside")!,
			items: () =>
				Array.from(
					element.querySelectorAll<HTMLElement>("[role='menuitem']")
				)
		};
	}

	function label(element: Element | null) {
		return element?.textContent?.trim();
	}

	it("focuses the first enabled item when the menu opens", async () => {
		const { fixture, trigger, items } = render();

		trigger.click();
		fixture.detectChanges();
		await fixture.whenStable();

		expect(label(document.activeElement)).toBe("Not started");
		expect(items()).toHaveLength(4);
	});

	it("skips a disabled first item when focusing on open", async () => {
		const { fixture, host, trigger } = render();
		host.current = "Not started";

		trigger.click();
		fixture.detectChanges();
		await fixture.whenStable();

		expect(label(document.activeElement)).toBe("Playing");
	});

	it("closes with Escape from the trigger and keeps the focus there", () => {
		const { fixture, host, trigger } = render(true);
		trigger.focus();

		press(trigger, "Escape");
		fixture.detectChanges();

		expect(host.closures).toBe(1);
		expect(document.activeElement).toBe(trigger);
	});

	it("closes with Escape from inside the menu and returns the focus to the trigger", () => {
		const { fixture, host, trigger, items } = render(true);
		items()[0].focus();

		press(items()[0], "Escape");
		fixture.detectChanges();

		expect(host.closures).toBe(1);
		expect(document.activeElement).toBe(trigger);
	});

	it("closes with Escape pressed anywhere on the page and returns the focus to the trigger", () => {
		const { fixture, host, trigger, outside } = render(true);
		outside.focus();

		press(outside, "Escape");
		fixture.detectChanges();

		expect(host.closures).toBe(1);
		expect(document.activeElement).toBe(trigger);
	});

	it("ignores Escape while the menu is closed", () => {
		const { host, outside } = render();
		outside.focus();

		press(outside, "Escape");

		expect(host.closures).toBe(0);
		expect(document.activeElement).toBe(outside);
	});

	it("stops listening for Escape once the menu closes", () => {
		const { fixture, host, trigger, outside } = render(true);

		press(trigger, "Escape");
		fixture.detectChanges();
		press(outside, "Escape");

		expect(host.closures).toBe(1);
	});

	it("moves down through the enabled items and wraps to the first", () => {
		const { items } = render(true);
		items()[0].focus();

		const visited = ["ArrowDown", "ArrowDown", "ArrowDown"].map(key => {
			press(document.activeElement!, key);
			return label(document.activeElement);
		});

		expect(visited).toEqual(["Completed", "Abandoned", "Not started"]);
	});

	it("moves up through the enabled items and wraps to the last", () => {
		const { items } = render(true);
		items()[0].focus();

		const visited = ["ArrowUp", "ArrowUp"].map(key => {
			press(document.activeElement!, key);
			return label(document.activeElement);
		});

		expect(visited).toEqual(["Abandoned", "Completed"]);
	});

	it("enters the menu from the trigger with the arrows", () => {
		const { trigger } = render(true);
		trigger.focus();

		press(trigger, "ArrowDown");
		expect(label(document.activeElement)).toBe("Not started");

		trigger.focus();
		press(trigger, "ArrowUp");
		expect(label(document.activeElement)).toBe("Abandoned");
	});

	it("jumps to the first and last enabled items with Home and End", () => {
		const { items } = render(true);
		items()[2].focus();

		press(document.activeElement!, "End");
		expect(label(document.activeElement)).toBe("Abandoned");

		press(document.activeElement!, "Home");
		expect(label(document.activeElement)).toBe("Not started");
	});

	it("prevents the page from scrolling on the keys it handles", () => {
		const { items } = render(true);
		items()[0].focus();

		for (const key of ["ArrowDown", "ArrowUp", "Home", "End"]) {
			expect(press(document.activeElement!, key).defaultPrevented).toBe(
				true
			);
		}
	});

	it("closes on Tab without preventing the default focus move", () => {
		const { fixture, host, items } = render(true);
		items()[0].focus();

		const event = press(items()[0], "Tab");
		fixture.detectChanges();

		expect(host.closures).toBe(1);
		expect(event.defaultPrevented).toBe(false);
	});

	it("leaves the focus on the last enabled item on Tab so the next stop is past the menu", () => {
		const { items } = render(true);
		items()[0].focus();

		press(items()[0], "Tab");

		expect(label(document.activeElement)).toBe("Abandoned");
	});

	it("leaves the focus on the trigger on Shift+Tab", () => {
		const { host, trigger, items } = render(true);
		items()[2].focus();

		const event = press(items()[2], "Tab", { shiftKey: true });

		expect(host.closures).toBe(1);
		expect(document.activeElement).toBe(trigger);
		expect(event.defaultPrevented).toBe(false);
	});

	it("leaves browser shortcuts with modifiers alone", () => {
		const { host, items } = render(true);
		items()[0].focus();

		const event = press(items()[0], "ArrowDown", { altKey: true });

		expect(event.defaultPrevented).toBe(false);
		expect(label(document.activeElement)).toBe("Not started");
		expect(host.closures).toBe(0);
	});

	it("does nothing with the arrows while the menu is closed", () => {
		const { trigger } = render();
		trigger.focus();

		const event = press(trigger, "ArrowDown");

		expect(event.defaultPrevented).toBe(false);
		expect(document.activeElement).toBe(trigger);
	});
});
