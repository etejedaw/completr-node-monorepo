import { TestBed } from "@angular/core/testing";

import { ExpandableText } from "./expandable-text";

describe("ExpandableText", () => {
	let widthChanged:
		((entries: { contentRect: { width: number } }[]) => void) | null;

	beforeEach(() => {
		widthChanged = null;
		vi.stubGlobal(
			"ResizeObserver",
			class {
				constructor(callback: typeof widthChanged) {
					widthChanged = callback;
				}
				observe = vi.fn();
				disconnect = vi.fn();
			}
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function stubOverflow(overflows: boolean) {
		vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(
			overflows ? 200 : 50
		);
		vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(
			100
		);
	}

	async function render(
		overflows: boolean,
		inputs: Record<string, unknown> = {}
	) {
		stubOverflow(overflows);
		const fixture = TestBed.createComponent(ExpandableText);
		fixture.componentRef.setInput("text", "A long review");
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		await fixture.whenStable();
		fixture.detectChanges();
		return fixture;
	}

	function root(fixture: Awaited<ReturnType<typeof render>>) {
		return fixture.nativeElement as HTMLElement;
	}

	function toggle(fixture: Awaited<ReturnType<typeof render>>) {
		return root(fixture).querySelector(
			"button"
		) as HTMLButtonElement | null;
	}

	it("renders the text clamped to six lines by default", () => {
		return render(false).then(fixture => {
			const paragraph = root(fixture).querySelector("p") as HTMLElement;

			expect(paragraph.textContent).toContain("A long review");
			expect(paragraph.classList).toContain("line-clamp-6");
			expect(paragraph.classList).not.toContain("line-clamp-4");
		});
	});

	it("clamps to four lines when asked", async () => {
		const fixture = await render(false, { lines: 4 });

		expect(root(fixture).querySelector("p")?.classList).toContain(
			"line-clamp-4"
		);
	});

	it("shows no toggle when the text fits", async () => {
		const fixture = await render(false);

		expect(toggle(fixture)).toBeNull();
	});

	it("offers Read more when the text overflows", async () => {
		const fixture = await render(true);

		expect(toggle(fixture)?.textContent).toContain("Read more");
		expect(toggle(fixture)?.getAttribute("aria-expanded")).toBe("false");
	});

	it("links the toggle to the paragraph it controls", async () => {
		const fixture = await render(true);
		const paragraph = root(fixture).querySelector("p") as HTMLElement;

		expect(toggle(fixture)?.getAttribute("aria-controls")).toBe(
			paragraph.id
		);
	});

	it("expands and collapses with the toggle", async () => {
		const fixture = await render(true);
		const paragraph = root(fixture).querySelector("p") as HTMLElement;

		toggle(fixture)?.click();
		fixture.detectChanges();
		expect(paragraph.classList).not.toContain("line-clamp-6");
		expect(toggle(fixture)?.textContent).toContain("Read less");
		expect(toggle(fixture)?.getAttribute("aria-expanded")).toBe("true");

		toggle(fixture)?.click();
		fixture.detectChanges();
		expect(paragraph.classList).toContain("line-clamp-6");
		expect(toggle(fixture)?.textContent).toContain("Read more");
	});

	it("collapses again when the text changes", async () => {
		const fixture = await render(true);
		toggle(fixture)?.click();
		fixture.detectChanges();

		fixture.componentRef.setInput("text", "Another review");
		fixture.detectChanges();

		expect(root(fixture).querySelector("p")?.classList).toContain(
			"line-clamp-6"
		);
	});

	it("re-measures when the width changes", async () => {
		const fixture = await render(false);
		expect(toggle(fixture)).toBeNull();

		stubOverflow(true);
		widthChanged?.([{ contentRect: { width: 320 } }]);
		await fixture.whenStable();
		fixture.detectChanges();

		expect(toggle(fixture)).not.toBeNull();
	});

	it("gives each instance its own content id", async () => {
		const first = await render(false);
		const second = await render(false);

		expect(root(first).querySelector("p")?.id).not.toBe(
			root(second).querySelector("p")?.id
		);
	});
});
