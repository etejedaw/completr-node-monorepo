import { TestBed } from "@angular/core/testing";

import { BacklogStatusPills } from "./backlog-status-pills";

describe("BacklogStatusPills", () => {
	function render(selected: string[], layout?: "wrap" | "scroll") {
		const fixture = TestBed.createComponent(BacklogStatusPills);
		fixture.componentRef.setInput("selected", selected);
		if (layout) fixture.componentRef.setInput("layout", layout);
		fixture.detectChanges();
		const element = fixture.nativeElement as HTMLElement;
		const emitted: string[] = [];
		fixture.componentInstance.statusSelect.subscribe(v => emitted.push(v));
		return { fixture, element, emitted };
	}

	function pills(element: HTMLElement) {
		return Array.from(element.querySelectorAll("button"));
	}

	function pill(element: HTMLElement, label: string) {
		return pills(element).find(b => b.textContent?.trim().endsWith(label))!;
	}

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [BacklogStatusPills] });
	});

	it("renders All followed by every status in display order", () => {
		const { element } = render([]);

		expect(
			pills(element).map(b => b.textContent?.replace(/\s+/g, " ").trim())
		).toEqual([
			"All",
			"schedule Not Started",
			"play_circle Playing",
			"check_circle Completed",
			"all_inclusive Endless",
			"cancel Abandoned"
		]);
	});

	it("marks All as pressed when nothing is selected", () => {
		const { element } = render([]);

		expect(pill(element, "All").getAttribute("aria-pressed")).toBe("true");
		expect(pill(element, "Playing").getAttribute("aria-pressed")).toBe(
			"false"
		);
	});

	it("marks only the selected status as pressed", () => {
		const { element } = render(["playing"]);

		expect(pill(element, "Playing").getAttribute("aria-pressed")).toBe(
			"true"
		);
		expect(pill(element, "All").getAttribute("aria-pressed")).toBe("false");
	});

	it("marks nothing as pressed when several statuses are selected", () => {
		const { element } = render(["playing", "completed"]);

		expect(
			pills(element).every(
				b => b.getAttribute("aria-pressed") === "false"
			)
		).toBe(true);
	});

	it("emits the status value from a pill and an empty string from All", () => {
		const { element, emitted } = render(["playing"]);

		pill(element, "Completed").click();
		pill(element, "All").click();

		expect(emitted).toEqual(["completed", ""]);
	});

	it("labels the navigation and switches the layout classes", () => {
		const wrap = render([]).element.querySelector("nav")!;
		const scroll = render([], "scroll").element.querySelector("nav")!;

		expect(wrap.getAttribute("aria-label")).toBe("Filter by status");
		expect(wrap.className).toContain("flex-wrap");
		expect(scroll.className).toContain("overflow-x-auto");
	});
});
