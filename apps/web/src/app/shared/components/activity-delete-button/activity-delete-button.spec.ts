import { TestBed } from "@angular/core/testing";

import { ActivityDeleteButton } from "./activity-delete-button";

describe("ActivityDeleteButton", () => {
	function render(tooltip?: string) {
		const fixture = TestBed.createComponent(ActivityDeleteButton);
		if (tooltip) fixture.componentRef.setInput("tooltip", tooltip);
		fixture.detectChanges();
		return fixture;
	}

	function button(fixture: ReturnType<typeof render>) {
		return (fixture.nativeElement as HTMLElement).querySelector(
			"button"
		) as HTMLButtonElement;
	}

	it("has an accessible name and the default tooltip", () => {
		const element = button(render());

		expect(element.getAttribute("aria-label")).toBe("Remove this activity");
		expect(element.title).toBe("Remove activity");
	});

	it("accepts a custom tooltip", () => {
		expect(button(render("Hide")).title).toBe("Hide");
	});

	it("emits pressed when clicked", () => {
		const fixture = render();
		const pressed = vi.fn();
		fixture.componentInstance.pressed.subscribe(pressed);

		button(fixture).click();

		expect(pressed).toHaveBeenCalledOnce();
	});
});
