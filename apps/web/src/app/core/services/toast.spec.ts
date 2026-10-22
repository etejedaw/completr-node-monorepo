import { type TemplateRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { NgpToastManager } from "ng-primitives/toast";

import { type Toast, ToastService, UNDO_WINDOW_MS } from "./toast";

describe("ToastService", () => {
	const template = {} as TemplateRef<unknown>;
	let toasts: ToastService;
	let refs: { dismiss: ReturnType<typeof vi.fn> }[];
	const manager = { show: vi.fn() };

	function lastContext() {
		return manager.show.mock.lastCall?.[1].context as Toast;
	}

	beforeEach(() => {
		vi.useFakeTimers();
		refs = [];
		manager.show.mockReset().mockImplementation(() => {
			const ref = { dismiss: vi.fn() };
			refs.push(ref);
			return ref;
		});
		TestBed.configureTestingModule({
			providers: [{ provide: NgpToastManager, useValue: manager }]
		});
		toasts = TestBed.inject(ToastService);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("show", () => {
		it("does nothing before a template is registered", () => {
			toasts.show("Hi");

			expect(manager.show).not.toHaveBeenCalled();
		});

		it("shows an info toast with the default duration", () => {
			toasts.registerTemplate(template);

			toasts.show("Hi");

			expect(manager.show).toHaveBeenCalledWith(
				template,
				expect.objectContaining({ duration: 4000 })
			);
			expect(lastContext()).toMatchObject({
				id: 1,
				message: "Hi",
				variant: "info"
			});
		});

		it("increments the id of each toast", () => {
			toasts.registerTemplate(template);

			toasts.show("One");
			toasts.show("Two");

			expect(lastContext().id).toBe(2);
		});

		it("dismisses the toast through its context", () => {
			toasts.registerTemplate(template);
			toasts.show("Hi");

			lastContext().onDismiss?.();

			expect(refs[0].dismiss).toHaveBeenCalledOnce();
		});

		it.each(["info", "success", "warning", "error"] as const)(
			"%s shortcut uses its variant and custom duration",
			variant => {
				toasts.registerTemplate(template);

				toasts[variant]("Msg", 1234);

				expect(lastContext().variant).toBe(variant);
				expect(manager.show.mock.lastCall?.[1].duration).toBe(1234);
			}
		);

		it("premium shows a titled toast of 5 seconds", () => {
			toasts.registerTemplate(template);

			toasts.premium("Go premium", "More lists");

			expect(lastContext()).toMatchObject({
				title: "Go premium",
				message: "More lists",
				variant: "premium"
			});
			expect(manager.show.mock.lastCall?.[1].duration).toBe(5000);
		});
	});

	describe("pending", () => {
		it("returns -1 before a template is registered", () => {
			expect(toasts.pending({ message: "x", onCommit: vi.fn() })).toBe(
				-1
			);
			expect(manager.show).not.toHaveBeenCalled();
		});

		it("shows a persistent toast with an Undo label", () => {
			toasts.registerTemplate(template);

			const id = toasts.pending({
				message: "Removed",
				onCommit: vi.fn()
			});

			expect(manager.show).toHaveBeenCalledWith(
				template,
				expect.objectContaining({
					persistent: true,
					dismissible: false
				})
			);
			expect(lastContext()).toMatchObject({
				id,
				message: "Removed",
				variant: "info",
				undoLabel: "Undo",
				durationMs: UNDO_WINDOW_MS
			});
		});

		it("honors a custom undo label and variant", () => {
			toasts.registerTemplate(template);

			toasts.pending({
				message: "Gone",
				onCommit: vi.fn(),
				undoLabel: "Restore",
				variant: "warning"
			});

			expect(lastContext()).toMatchObject({
				undoLabel: "Restore",
				variant: "warning"
			});
		});

		it("commits when the undo window elapses", () => {
			toasts.registerTemplate(template);
			const onCommit = vi.fn();
			toasts.pending({ message: "x", onCommit });

			vi.advanceTimersByTime(UNDO_WINDOW_MS - 1);
			expect(onCommit).not.toHaveBeenCalled();

			vi.advanceTimersByTime(1);
			expect(onCommit).toHaveBeenCalledOnce();
			expect(refs[0].dismiss).toHaveBeenCalledOnce();
		});

		it("runs onUndo and never commits when undone", () => {
			toasts.registerTemplate(template);
			const onCommit = vi.fn();
			const onUndo = vi.fn();
			toasts.pending({ message: "x", onCommit, onUndo });

			lastContext().onUndo?.();
			vi.advanceTimersByTime(UNDO_WINDOW_MS * 2);

			expect(onUndo).toHaveBeenCalledOnce();
			expect(onCommit).not.toHaveBeenCalled();
			expect(refs[0].dismiss).toHaveBeenCalledOnce();
		});

		it("commits immediately when dismissed", () => {
			toasts.registerTemplate(template);
			const onCommit = vi.fn();
			toasts.pending({ message: "x", onCommit });

			lastContext().onDismiss?.();
			vi.advanceTimersByTime(UNDO_WINDOW_MS * 2);

			expect(onCommit).toHaveBeenCalledOnce();
		});

		it("ignores an undo after the commit", () => {
			toasts.registerTemplate(template);
			const onUndo = vi.fn();
			const id = toasts.pending({
				message: "x",
				onCommit: vi.fn(),
				onUndo
			});

			vi.advanceTimersByTime(UNDO_WINDOW_MS);
			toasts.undo(id);

			expect(onUndo).not.toHaveBeenCalled();
		});

		it("ignores unknown ids", () => {
			expect(() => {
				toasts.undo(99);
				toasts.dismiss(99);
			}).not.toThrow();
		});
	});
});
