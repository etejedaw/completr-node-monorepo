import { TestBed } from "@angular/core/testing";

import { ToastService } from "../../../core/services/toast";
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
});
