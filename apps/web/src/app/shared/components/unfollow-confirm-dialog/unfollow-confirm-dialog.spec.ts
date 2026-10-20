import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { ViewportService } from "../../../core/services/viewport";
import { UnfollowConfirmDialog } from "./unfollow-confirm-dialog";

function buttonLabelled(label: string): HTMLButtonElement | undefined {
	return Array.from(document.body.querySelectorAll("button")).find(button =>
		button.textContent?.trim().startsWith(label)
	);
}

describe("UnfollowConfirmDialog", () => {
	function render(busy = false) {
		const fixture = TestBed.createComponent(UnfollowConfirmDialog);
		fixture.componentRef.setInput("username", "ada");
		fixture.componentRef.setInput("busy", busy);
		fixture.detectChanges();
		return fixture;
	}

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [UnfollowConfirmDialog],
			providers: [
				{
					provide: ViewportService,
					useValue: { isMobile: signal(false) }
				}
			]
		});
	});

	afterEach(() => {
		TestBed.resetTestingModule();
	});

	it("names the user in the heading", () => {
		render();

		expect(document.body.textContent).toContain("Unfollow @ada?");
	});

	it("emits confirmed and cancelled from its buttons", () => {
		const fixture = render();
		const confirmed = vi.fn();
		const cancelled = vi.fn();
		fixture.componentInstance.confirmed.subscribe(confirmed);
		fixture.componentInstance.cancelled.subscribe(cancelled);

		buttonLabelled("Unfollow")?.click();
		buttonLabelled("Cancel")?.click();

		expect(confirmed).toHaveBeenCalledTimes(1);
		expect(cancelled).toHaveBeenCalledTimes(1);
	});

	it("disables both actions and shows progress while busy", () => {
		render(true);

		expect(buttonLabelled("Unfollowing...")?.disabled).toBe(true);
		expect(buttonLabelled("Cancel")?.disabled).toBe(true);
	});
});
