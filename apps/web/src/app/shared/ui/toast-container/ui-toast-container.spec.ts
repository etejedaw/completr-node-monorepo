import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { TOAST_CONFIG, ToastService } from "../../../core/services/toast";
import { UiToastContainer } from "./ui-toast-container";

describe("UiToastContainer", () => {
	const toasts = { registerTemplate: vi.fn() };

	beforeEach(() => {
		toasts.registerTemplate.mockReset();
		TestBed.configureTestingModule({
			providers: [{ provide: ToastService, useValue: toasts }]
		});
	});

	it("registers its template with the toast service", () => {
		const fixture = TestBed.createComponent(UiToastContainer);
		fixture.detectChanges();

		expect(toasts.registerTemplate).toHaveBeenCalledOnce();
	});

	describe("variants", () => {
		function component() {
			const fixture = TestBed.createComponent(UiToastContainer);
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
			const fixture = TestBed.createComponent(UiToastContainer);
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

		function renderedToasts(text: string) {
			return [
				...document.querySelectorAll<HTMLElement>("[ngpToast]")
			].filter(toast => toast.textContent?.includes(text));
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

			const all = renderedToasts("Message ");
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

			const premiumToasts = renderedToasts("Your Up Next has no limit.");
			expect(premiumToasts).toHaveLength(1);
		});

		describe("action", () => {
			function actionButton(text: string, label: string) {
				const toast = renderedToasts(text)[0];
				return [...toast.querySelectorAll("button")].find(
					button => button.textContent?.trim() === label
				);
			}

			it("renders the action as a button and runs it once on repeated clicks", async () => {
				const fixture = await renderContainer();
				const run = vi.fn();
				service.success("Rewind ready", {
					action: { label: "View", run }
				});
				await settle(fixture);

				const button = actionButton("Rewind ready", "View");
				expect(button).toBeDefined();
				expect(button?.type).toBe("button");
				button?.click();
				button?.click();
				button?.click();
				await settle(fixture);

				expect(run).toHaveBeenCalledOnce();
			});

			it("can be reached and triggered with the keyboard", async () => {
				const fixture = await renderContainer();
				const run = vi.fn();
				service.info("Keyboard toast", {
					action: { label: "Open", run }
				});
				await settle(fixture);

				const button = actionButton("Keyboard toast", "Open");
				button?.focus();
				expect(document.activeElement).toBe(button);
				button?.dispatchEvent(
					new KeyboardEvent("keydown", {
						key: "Enter",
						bubbles: true
					})
				);
				button?.click();
				await settle(fixture);

				expect(run).toHaveBeenCalledOnce();
			});

			it("closes the toast when the action is used", async () => {
				const fixture = await renderContainer();
				service.success("Closing toast", {
					action: { label: "View", run: vi.fn() }
				});
				await settle(fixture);

				actionButton("Closing toast", "View")?.click();
				await settle(fixture);

				expect(
					renderedToasts("Closing toast").filter(
						toast => toast.dataset["visible"] !== "false"
					)
				).toHaveLength(0);
			});

			it("never runs the action when the toast is closed with the dismiss button", async () => {
				const fixture = await renderContainer();
				const run = vi.fn();
				service.success("Dismissed toast", {
					action: { label: "View", run }
				});
				await settle(fixture);

				renderedToasts("Dismissed toast")[0]
					.querySelector<HTMLButtonElement>("[aria-label='Dismiss']")
					?.click();
				await settle(fixture);

				expect(run).not.toHaveBeenCalled();
			});

			it("renders a message without an action as before", async () => {
				const fixture = await renderContainer();
				service.success("Plain toast");
				await settle(fixture);

				const buttons = [
					...renderedToasts("Plain toast")[0].querySelectorAll(
						"button"
					)
				];
				expect(buttons.map(b => b.getAttribute("aria-label"))).toEqual([
					"Dismiss"
				]);
			});
		});
	});
});
