import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { ViewportService } from "../../../core/services/viewport";
import { UiOptionPicker } from "./ui-option-picker";
import { type UiPickerOption } from "./ui-option-picker.model";

const options: UiPickerOption[] = [
	{ value: "", label: "All", icon: "apps", count: 10 },
	{
		value: "playing",
		label: "Playing",
		icon: "play_arrow",
		count: 3,
		hint: "Now"
	},
	{ value: "vip", label: "VIP", icon: "star", locked: true }
];

describe("UiOptionPicker", () => {
	function render(inputs: Record<string, unknown> = {}, mobile = false) {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				{
					provide: ViewportService,
					useValue: { isMobile: signal(mobile) }
				}
			]
		});
		const fixture = TestBed.createComponent(UiOptionPicker);
		fixture.componentRef.setInput("label", "Status");
		fixture.componentRef.setInput("heading", "Filter by status");
		fixture.componentRef.setInput("options", options);
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		return fixture;
	}

	function root(fixture: ReturnType<typeof render>) {
		return fixture.nativeElement as HTMLElement;
	}

	function trigger(fixture: ReturnType<typeof render>) {
		return root(fixture).querySelector("button") as HTMLButtonElement;
	}

	function sheet() {
		return document.body.querySelector('[role="dialog"]');
	}

	function sheetOption(fixture: ReturnType<typeof render>, label: string) {
		return Array.from(
			document.body.querySelectorAll<HTMLButtonElement>(
				"ui-bottom-sheet li button"
			)
		).find(button =>
			button.textContent?.includes(label)
		) as HTMLButtonElement;
	}

	describe("trigger", () => {
		it("shows the label with the placeholder when nothing matches", () => {
			const fixture = render({
				value: "unknown",
				placeholder: "Pick one"
			});

			expect(trigger(fixture).getAttribute("aria-label")).toBe(
				"Status: Pick one"
			);
			expect(trigger(fixture).textContent).toContain("Pick one");
		});

		it("shows the selected option", () => {
			const fixture = render({ value: "playing" });

			expect(trigger(fixture).getAttribute("aria-label")).toBe(
				"Status: Playing"
			);
			expect(trigger(fixture).textContent).toContain("play_arrow");
		});

		it("renders the compact variant with label and selection inline", () => {
			const fixture = render({ value: "playing", variant: "compact" });

			expect(trigger(fixture).textContent).toContain("Status");
			expect(trigger(fixture).textContent).toContain("Playing");
			expect(trigger(fixture).className).toContain("border-brand");
		});

		it("flags the trigger as invalid and describes it", () => {
			const fixture = render({ invalid: true, describedBy: "err" });

			expect(trigger(fixture).getAttribute("aria-invalid")).toBe("true");
			expect(trigger(fixture).getAttribute("aria-describedby")).toBe(
				"err"
			);
		});

		it("marks a modified selection with a dot and says so in its accessible name", () => {
			const fixture = render({
				value: "playing",
				variant: "compact",
				modified: true
			});

			expect(trigger(fixture).getAttribute("aria-label")).toBe(
				"Status: Playing (modified)"
			);
			const dot = trigger(fixture).querySelector(
				"[data-modified-indicator]"
			);
			expect(dot).not.toBeNull();
			expect(dot?.getAttribute("aria-hidden")).toBe("true");
		});

		it("shows no modified mark when nothing is selected or nothing changed", () => {
			const placeholder = render({ value: "unknown", modified: true });
			expect(trigger(placeholder).getAttribute("aria-label")).toBe(
				"Status: None"
			);
			expect(
				trigger(placeholder).querySelector("[data-modified-indicator]")
			).toBeNull();
			TestBed.resetTestingModule();

			const untouched = render({ value: "playing" });
			expect(trigger(untouched).getAttribute("aria-label")).toBe(
				"Status: Playing"
			);
			expect(
				trigger(untouched).querySelector("[data-modified-indicator]")
			).toBeNull();
		});

		it("drops the modified mark as soon as the input turns off", () => {
			const fixture = render({ value: "playing", modified: true });

			fixture.componentRef.setInput("modified", false);
			fixture.detectChanges();

			expect(trigger(fixture).getAttribute("aria-label")).toBe(
				"Status: Playing"
			);
			expect(
				trigger(fixture).querySelector("[data-modified-indicator]")
			).toBeNull();
		});

		it("announces a menu on desktop and a dialog on mobile", () => {
			expect(trigger(render()).getAttribute("aria-haspopup")).toBe(
				"menu"
			);
			TestBed.resetTestingModule();
			expect(
				trigger(render({}, true)).getAttribute("aria-haspopup")
			).toBe("dialog");
		});
	});

	describe("on desktop", () => {
		it("does not open the bottom sheet", () => {
			const fixture = render();

			trigger(fixture).click();
			fixture.detectChanges();

			expect(sheet()).toBeNull();
		});
	});

	describe("on mobile", () => {
		it("opens a bottom sheet with every option", () => {
			const fixture = render({}, true);

			trigger(fixture).click();
			fixture.detectChanges();

			expect(sheet()?.getAttribute("aria-label")).toBe(
				"Filter by status"
			);
			expect(
				document.body.querySelectorAll("ui-bottom-sheet li")
			).toHaveLength(3);
		});

		it("renders counts, hints and the lock icon", () => {
			const fixture = render({}, true);

			trigger(fixture).click();
			fixture.detectChanges();

			expect(sheetOption(fixture, "Playing").textContent).toContain("3");
			expect(sheetOption(fixture, "Playing").textContent).toContain(
				"Now"
			);
			expect(sheetOption(fixture, "VIP").textContent).toContain("lock");
		});

		it("marks the current option as pressed", () => {
			const fixture = render({ value: "playing" }, true);

			trigger(fixture).click();
			fixture.detectChanges();

			expect(
				sheetOption(fixture, "Playing").getAttribute("aria-pressed")
			).toBe("true");
			expect(
				sheetOption(fixture, "All").getAttribute("aria-pressed")
			).toBe("false");
		});

		it("sets the value and closes the sheet when an option is chosen", () => {
			const fixture = render({}, true);
			trigger(fixture).click();
			fixture.detectChanges();

			sheetOption(fixture, "Playing").click();
			fixture.detectChanges();

			expect(fixture.componentInstance.value()).toBe("playing");
			expect(sheet()).toBeNull();
			expect(trigger(fixture).getAttribute("aria-label")).toBe(
				"Status: Playing"
			);
		});

		it("emits lockedSelected instead of changing the value for a locked option", () => {
			const fixture = render({}, true);
			const locked = vi.fn();
			fixture.componentInstance.lockedSelected.subscribe(locked);
			trigger(fixture).click();
			fixture.detectChanges();

			sheetOption(fixture, "VIP").click();
			fixture.detectChanges();

			expect(locked).toHaveBeenCalledWith(
				expect.objectContaining({ value: "vip" })
			);
			expect(fixture.componentInstance.value()).toBe("");
			expect(sheet()).toBeNull();
		});

		it("labels the modified option in the sheet and keeps its hint", () => {
			const fixture = render({ value: "playing", modified: true }, true);

			trigger(fixture).click();
			fixture.detectChanges();

			const playing = sheetOption(fixture, "Playing");
			expect(playing.textContent).toContain("Modified");
			expect(playing.textContent).toContain("Now");
			expect(sheetOption(fixture, "All").textContent).not.toContain(
				"Modified"
			);
		});

		it("runs an action and closes the sheet", () => {
			const fixture = render(
				{
					actions: [
						{ id: "save", label: "Save view", icon: "bookmark" }
					]
				},
				true
			);
			const selected = vi.fn();
			fixture.componentInstance.actionSelected.subscribe(selected);
			trigger(fixture).click();
			fixture.detectChanges();

			const action = Array.from(
				document.body.querySelectorAll<HTMLButtonElement>(
					"ui-bottom-sheet button"
				)
			).find(button => button.textContent?.includes("Save view"));
			action?.click();
			fixture.detectChanges();

			expect(selected).toHaveBeenCalledWith("save");
			expect(sheet()).toBeNull();
		});

		it("closes the sheet from the backdrop", () => {
			const fixture = render({}, true);
			trigger(fixture).click();
			fixture.detectChanges();
			const openedAt = performance.now();
			vi.spyOn(performance, "now").mockReturnValue(openedAt + 1000);

			(
				document.body.querySelector(
					'[aria-label="Close Filter by status"]'
				) as HTMLButtonElement
			).click();
			vi.restoreAllMocks();
			fixture.detectChanges();

			expect(sheet()).toBeNull();
		});

		it("renders link options as anchors", () => {
			const fixture = render(
				{
					options: [
						{
							value: "a",
							label: "Section A",
							link: "/help",
							fragment: "a"
						}
					]
				},
				true
			);
			trigger(fixture).click();
			fixture.detectChanges();

			const anchor = document.body.querySelector("ui-bottom-sheet li a");
			expect(anchor?.getAttribute("href")).toBe("/help#a");
		});
	});

	describe("input variant", () => {
		it("uses the input box, takes the trigger id and keeps the value in the accessible name", () => {
			const fixture = render({
				variant: "input",
				triggerId: "status-field"
			});
			const button = trigger(fixture);

			expect(button.id).toBe("status-field");
			expect(button.classList).toContain("ui-input");
			expect(button.getAttribute("aria-label")).toBe("Status: All");
		});

		it("does not render the inline label of the field variant", () => {
			const fixture = render({ variant: "input", value: "playing" });

			expect(trigger(fixture).textContent).not.toContain("Status");
			expect(trigger(fixture).textContent).toContain("Playing");
		});

		it("shows the placeholder without an icon when nothing is picked", () => {
			const fixture = render({
				variant: "input",
				options: [{ value: "a", label: "Alpha" }],
				value: "",
				placeholder: "Pick a feature"
			});
			const button = trigger(fixture);

			expect(button.textContent).toContain("Pick a feature");
			expect(button.querySelectorAll(".material-icons")).toHaveLength(1);
		});

		it("is named by an external label pointing at the trigger id", () => {
			const host = document.createElement("label");
			host.htmlFor = "feature-field";
			host.textContent = "Feature";
			document.body.append(host);
			const fixture = render({
				variant: "input",
				triggerId: "feature-field"
			});
			document.body.append(root(fixture));

			expect(host.control).toBe(trigger(fixture));
			host.remove();
		});
	});
});
