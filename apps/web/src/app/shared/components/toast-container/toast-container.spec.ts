import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { TOAST_CONFIG, ToastService } from "../../../core/services/toast";
import { ToastContainer } from "./toast-container";

describe("ToastContainer", () => {
	const toasts = { registerTemplate: vi.fn() };

	beforeEach(() => {
		toasts.registerTemplate.mockReset();
		TestBed.configureTestingModule({
			providers: [{ provide: ToastService, useValue: toasts }]
		});
	});

	it("registers its template with the toast service", () => {
		const fixture = TestBed.createComponent(ToastContainer);
		fixture.detectChanges();

		expect(toasts.registerTemplate).toHaveBeenCalledOnce();
	});

	describe("variants", () => {
		function component() {
			const fixture = TestBed.createComponent(ToastContainer);
			fixture.detectChanges();
			return fixture.componentInstance as unknown as {
				iconFor(variant: string): string;
				classesFor(variant: string): string;
			};
		}

		it.each([
			["success", "check_circle"],
			["warning", "warning"],
			["error", "error"],
			["premium", "workspace_premium"],
			["info", "info"]
		])("uses the %s icon %s", (variant, icon) => {
			expect(component().iconFor(variant)).toBe(icon);
		});

		it.each([
			["success", "text-success"],
			["warning", "text-warning"],
			["error", "text-danger"],
			["premium", "text-premium"],
			["info", "text-brand"]
		])("styles %s toasts with %s", (variant, className) => {
			expect(component().classesFor(variant)).toContain(className);
		});
	});

	describe("with the real toast service", () => {
		let service: ToastService;

		async function renderContainer() {
			TestBed.resetTestingModule();
			const fixture = TestBed.createComponent(ToastContainer);
			TestBed.inject(ApplicationRef).components.push(
				fixture.componentRef
			);
			fixture.detectChanges();
			service = TestBed.inject(ToastService);
			return fixture;
		}

		async function settle(fixture: { whenStable(): Promise<unknown> }) {
			await new Promise(resolve => setTimeout(resolve));
			TestBed.inject(ApplicationRef).tick();
			await fixture.whenStable();
		}

		function renderedToasts() {
			return [...document.querySelectorAll<HTMLElement>("[ngpToast]")];
		}

		afterEach(() => {
			TestBed.resetTestingModule();
		});

		it("keeps at most the configured number of toasts visible and hides the rest", async () => {
			const fixture = await renderContainer();

			for (let i = 1; i <= TOAST_CONFIG.maxToasts + 3; i++) {
				service.info(`Message ${i}`);
			}
			await settle(fixture);

			const all = renderedToasts();
			const visible = all.filter(t => t.dataset["visible"] === "true");
			const hidden = all.filter(t => t.dataset["visible"] === "false");
			expect(visible).toHaveLength(TOAST_CONFIG.maxToasts);
			expect(hidden).toHaveLength(3);
			expect(visible.map(t => t.textContent)).toEqual(
				expect.arrayContaining([expect.stringContaining("Message 7")])
			);
			hidden.forEach(t =>
				expect(t.className).toContain("data-[visible=false]:hidden")
			);
		});

		it("shows a single toast when the same message is fired repeatedly", async () => {
			const fixture = await renderContainer();

			for (let i = 0; i < 6; i++) {
				service.premium("Premium perk", "Your Up Next has no limit.");
			}
			await settle(fixture);
			await settle(fixture);

			const premiumToasts = renderedToasts().filter(t =>
				t.textContent?.includes("Your Up Next has no limit.")
			);
			expect(premiumToasts).toHaveLength(1);
		});
	});
});
