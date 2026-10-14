import { signal } from "@angular/core";
import { type ComponentFixture, TestBed } from "@angular/core/testing";

import { ViewportService } from "../../../core/services/viewport";
import { MonthYearPicker } from "./month-year-picker";

describe("MonthYearPicker", () => {
	let fixture: ComponentFixture<MonthYearPicker>;
	let chosenMonths: Date[];

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				{
					provide: ViewportService,
					useValue: { isMobile: signal(false).asReadonly() }
				}
			]
		});
	});

	function setup(
		month: Date,
		minYear: number | null,
		maxYear: number | null
	) {
		fixture = TestBed.createComponent(MonthYearPicker);
		chosenMonths = [];
		fixture.componentRef.setInput("month", month);
		fixture.componentRef.setInput("minYear", minYear);
		fixture.componentRef.setInput("maxYear", maxYear);
		fixture.componentInstance.monthChosen.subscribe(date =>
			chosenMonths.push(date)
		);
		fixture.detectChanges();
	}

	function yearOptionLabels(): string[] {
		return fixture.componentInstance["yearOptions"]().map(o => o.label);
	}

	it("lists every year between the given bounds", () => {
		setup(new Date(2024, 4, 10), 2022, 2026);
		expect(yearOptionLabels()).toEqual([
			"2022",
			"2023",
			"2024",
			"2025",
			"2026"
		]);
	});

	it("extends the range to include the year being shown", () => {
		setup(new Date(2018, 0, 1), 2022, 2026);
		expect(yearOptionLabels()[0]).toBe("2018");
	});

	it("keeps the shown month when a year is chosen", () => {
		setup(new Date(2024, 4, 10), 2020, 2026);
		fixture.componentInstance["chooseYear"](["2021"]);
		expect(chosenMonths).toEqual([new Date(2021, 4, 10)]);
	});

	it("clamps the day when the target month is shorter", () => {
		setup(new Date(2024, 0, 31), 2020, 2026);
		fixture.componentInstance["chooseMonth"](1);
		expect(chosenMonths).toEqual([new Date(2024, 1, 29)]);
	});

	it("ignores choosing the year already shown", () => {
		setup(new Date(2024, 4, 10), 2020, 2026);
		fixture.componentInstance["chooseYear"](["2024"]);
		expect(chosenMonths).toEqual([]);
	});

	it("renders the trigger with the shown month and year", () => {
		setup(new Date(2024, 4, 10), 2020, 2026);
		const trigger = fixture.nativeElement.querySelector(
			"button"
		) as HTMLButtonElement;
		expect(trigger.textContent).toContain("May 2024");
	});
});
