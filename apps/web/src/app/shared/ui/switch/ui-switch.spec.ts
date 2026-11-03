import { TestBed } from "@angular/core/testing";
import userEvent from "@testing-library/user-event";

import { UiSwitch } from "./ui-switch";

describe("UiSwitch", () => {
	function renderedSwitch(inputs: Record<string, unknown> = {}) {
		const fixture = TestBed.createComponent(UiSwitch);
		fixture.componentRef.setInput("ariaLabel", "Account active");
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		const button = (fixture.nativeElement as HTMLElement).querySelector(
			"[role=switch]"
		) as HTMLButtonElement;
		return { fixture, button };
	}

	it("toggles once with Space", async () => {
		const user = userEvent.setup();
		const { fixture, button } = renderedSwitch();

		button.focus();
		await user.keyboard(" ");
		fixture.detectChanges();

		expect(button.getAttribute("aria-checked")).toBe("true");
	});

	it("toggles back and forth with repeated Space presses", async () => {
		const user = userEvent.setup();
		const { fixture, button } = renderedSwitch();

		button.focus();
		await user.keyboard("   ");
		fixture.detectChanges();

		expect(button.getAttribute("aria-checked")).toBe("true");
	});

	it("toggles once with Enter and with a click", async () => {
		const user = userEvent.setup();
		const { fixture, button } = renderedSwitch();

		button.focus();
		await user.keyboard("{Enter}");
		fixture.detectChanges();
		expect(button.getAttribute("aria-checked")).toBe("true");

		await user.click(button);
		fixture.detectChanges();
		expect(button.getAttribute("aria-checked")).toBe("false");
	});

	it("ignores Space while disabled", async () => {
		const user = userEvent.setup();
		const { fixture, button } = renderedSwitch({ disabled: true });

		button.focus();
		await user.keyboard(" ");
		fixture.detectChanges();

		expect(button.getAttribute("aria-checked")).toBe("false");
	});
});
