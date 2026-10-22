import { TestBed } from "@angular/core/testing";

import { PasswordRules } from "./password-rules";

describe("PasswordRules", () => {
	function render(password: string) {
		const fixture = TestBed.createComponent(PasswordRules);
		fixture.componentRef.setInput("password", password);
		fixture.componentRef.setInput("listId", "rules");
		fixture.detectChanges();
		return fixture;
	}

	function items(fixture: ReturnType<typeof render>) {
		return Array.from(
			(fixture.nativeElement as HTMLElement).querySelectorAll("li")
		);
	}

	it("renders a labelled list with the given id and one item per rule", () => {
		const fixture = render("");
		const list = (fixture.nativeElement as HTMLElement).querySelector(
			"ul"
		) as HTMLUListElement;

		expect(list.id).toBe("rules");
		expect(list.getAttribute("aria-label")).toBe("Password requirements");
		expect(items(fixture).map(item => item.textContent)).toEqual([
			expect.stringContaining("8–15 characters"),
			expect.stringContaining("A lowercase letter"),
			expect.stringContaining("An uppercase letter"),
			expect.stringContaining("A number"),
			expect.stringContaining("A symbol, like ! or #")
		]);
	});

	it("marks every rule as missing for an empty password", () => {
		const fixture = render("");

		for (const item of items(fixture)) {
			expect(item.textContent).toContain("(missing)");
			expect(item.textContent).toContain("radio_button_unchecked");
			expect(item.className).toContain("text-fg-muted");
		}
	});

	it("marks every rule as done for a strong password", () => {
		const fixture = render("Abcdef1!");

		for (const item of items(fixture)) {
			expect(item.textContent).toContain("(done)");
			expect(item.textContent).toContain("check_circle");
			expect(item.className).toContain("text-success");
		}
	});

	it("marks only the satisfied rules", () => {
		const fixture = render("abc");
		const states = items(fixture).map(item =>
			item.textContent?.includes("(done)")
		);

		expect(states).toEqual([false, true, false, false, false]);
	});

	it("updates when the password changes", () => {
		const fixture = render("abc");

		fixture.componentRef.setInput("password", "ABC");
		fixture.detectChanges();

		const states = items(fixture).map(item =>
			item.textContent?.includes("(done)")
		);
		expect(states).toEqual([false, false, true, false, false]);
	});
});
