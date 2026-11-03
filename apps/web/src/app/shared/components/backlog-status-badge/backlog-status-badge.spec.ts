import { TestBed } from "@angular/core/testing";

import { BacklogStatusBadge } from "./backlog-status-badge";

describe("BacklogStatusBadge", () => {
	function renderBadge(status: string) {
		const fixture = TestBed.createComponent(BacklogStatusBadge);
		fixture.componentRef.setInput("status", status);
		fixture.detectChanges();
		return fixture;
	}

	function badge(fixture: ReturnType<typeof renderBadge>) {
		return (fixture.nativeElement as HTMLElement).querySelector(
			"ui-badge"
		) as HTMLElement;
	}

	it.each([
		["not_started", "Not Started", "schedule", "text-fg-muted"],
		["playing", "Playing", "play_circle", "text-playing"],
		["completed", "Completed", "check_circle", "text-success"],
		["abandoned", "Abandoned", "cancel", "text-danger"],
		["endless", "Endless", "all_inclusive", "text-brand"]
	])(
		"paints %s with its label, icon and tone",
		(status, label, icon, tone) => {
			const element = badge(renderBadge(status));

			expect(element.textContent).toContain(label);
			expect(
				element.querySelector('.material-icons[aria-hidden="true"]')
					?.textContent
			).toContain(icon);
			expect(element.classList).toContain(tone);
		}
	);

	it("keeps an unknown status readable with the neutral tone", () => {
		const element = badge(renderBadge("mystery"));

		expect(element.textContent).toContain("mystery");
		expect(element.classList).toContain("text-fg-secondary");
	});

	it("repaints when the status changes", () => {
		const fixture = renderBadge("playing");
		fixture.componentRef.setInput("status", "completed");
		fixture.detectChanges();

		expect(badge(fixture).textContent).toContain("Completed");
		expect(badge(fixture).classList).toContain("text-success");
		expect(badge(fixture).classList).not.toContain("text-playing");
	});
});
