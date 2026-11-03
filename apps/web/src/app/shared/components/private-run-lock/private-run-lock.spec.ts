import { TestBed } from "@angular/core/testing";

import { PrivateRunLock } from "./private-run-lock";

describe("PrivateRunLock", () => {
	it("renders a lock icon announced as a private run", () => {
		const fixture = TestBed.createComponent(PrivateRunLock);
		fixture.detectChanges();

		const icon = fixture.nativeElement.querySelector("[role=img]");
		expect(icon.textContent.trim()).toBe("lock");
		expect(icon.getAttribute("aria-label")).toBe(
			"Private run: only you can see it"
		);
		expect(icon.getAttribute("title")).toBe(
			"Private run: only you can see it"
		);
	});

	it("applies the requested icon size", () => {
		const fixture = TestBed.createComponent(PrivateRunLock);
		fixture.componentRef.setInput("iconSizeClass", "text-sm");
		fixture.detectChanges();

		const icon = fixture.nativeElement.querySelector("[role=img]");
		expect(icon.classList).toContain("text-sm");
		expect(icon.classList).toContain("text-fg-muted");
	});
});
