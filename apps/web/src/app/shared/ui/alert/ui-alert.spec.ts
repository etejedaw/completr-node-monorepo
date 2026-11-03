import { TestBed } from "@angular/core/testing";

import { UiAlert } from "./ui-alert";

describe("UiAlert", () => {
	function renderedAlert(inputs: Record<string, unknown> = {}) {
		const fixture = TestBed.createComponent(UiAlert);
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		return { fixture, alert: fixture.nativeElement as HTMLElement };
	}

	it("is a danger alert by default", () => {
		const { alert } = renderedAlert();

		expect(alert.getAttribute("role")).toBe("alert");
		expect(alert.classList).toContain("text-danger");
		expect(alert.querySelector(".material-icons")?.textContent).toBe(
			"error_outline"
		);
	});

	it.each([
		["warning", "alert"],
		["info", "status"],
		["success", "status"],
		["premium", "status"]
	])("gives the %s tone the %s role", (tone, role) => {
		const { alert } = renderedAlert({ tone });

		expect(alert.getAttribute("role")).toBe(role);
	});

	it("paints the premium tone in gold with its own icon", () => {
		const { alert } = renderedAlert({ tone: "premium" });

		expect(alert.classList).toContain("text-premium");
		expect(alert.className).not.toContain("!");
		expect(alert.querySelector(".material-icons")?.textContent).toBe(
			"workspace_premium"
		);
	});

	it("lets an informative warning announce itself politely", () => {
		const { alert } = renderedAlert({ tone: "warning", role: "status" });

		expect(alert.getAttribute("role")).toBe("status");
		expect(alert.classList).toContain("text-warning");
	});

	it("falls back to the tone role when the override is cleared", () => {
		const { fixture, alert } = renderedAlert({
			tone: "warning",
			role: "status"
		});
		fixture.componentRef.setInput("role", null);
		fixture.detectChanges();

		expect(alert.getAttribute("role")).toBe("alert");
	});

	it("uses a custom icon hidden from assistive technologies", () => {
		const { alert } = renderedAlert({ tone: "premium", icon: "lock" });
		const icon = alert.querySelector(".material-icons");

		expect(icon?.textContent).toBe("lock");
		expect(icon?.getAttribute("aria-hidden")).toBe("true");
	});
});
