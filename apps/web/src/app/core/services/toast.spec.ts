import { type TemplateRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import {
	type Toast,
	TOAST_LIBRARY_LOADER,
	ToastService,
	UNDO_WINDOW_MS
} from "./toast";

const IDLE_PRELOAD_MS = 2000;

describe("ToastService", () => {
	const template = {} as TemplateRef<unknown>;
	let toasts: ToastService;
	let refs: { dismiss: ReturnType<typeof vi.fn> }[];
	const manager = { show: vi.fn(), destroyed: vi.fn() };
	let loadLibrary: ReturnType<typeof vi.fn>;

	function lastContext() {
		return manager.show.mock.lastCall?.[1].context as Toast;
	}

	function fakeLibrary() {
		return {
			NgpToastManager: class {
				show = manager.show;
				ngOnDestroy() {
					manager.destroyed();
				}
			},
			provideToastConfig: () => []
		};
	}

	function createService(loader: () => Promise<unknown>) {
		loadLibrary = vi.fn(loader);
		TestBed.configureTestingModule({
			providers: [
				{ provide: TOAST_LIBRARY_LOADER, useValue: loadLibrary }
			]
		});
		return TestBed.inject(ToastService);
	}

	beforeEach(async () => {
		vi.useFakeTimers();
		refs = [];
		manager.show.mockReset().mockImplementation(() => {
			const ref = { dismiss: vi.fn() };
			refs.push(ref);
			return ref;
		});
		toasts = createService(() => Promise.resolve(fakeLibrary()));
		await vi.advanceTimersByTimeAsync(IDLE_PRELOAD_MS);
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

	describe("lazy loading", () => {
		let release: () => void;
		let lazy: ToastService;

		function gatedLoader() {
			const gate = new Promise<void>(resolve => (release = resolve));
			return () => gate.then(() => fakeLibrary());
		}

		async function setUpLazy(loader: () => Promise<unknown>) {
			TestBed.resetTestingModule();
			manager.show.mockClear();
			manager.destroyed.mockClear();
			lazy = createService(loader);
			lazy.registerTemplate(template);
		}

		it("shows every toast fired before the import ends, in order and once", async () => {
			await setUpLazy(gatedLoader());

			lazy.info("One");
			lazy.error("Two");
			lazy.success("Three");
			expect(manager.show).not.toHaveBeenCalled();

			release();
			await vi.advanceTimersByTimeAsync(0);

			const messages = manager.show.mock.calls.map(
				call => (call[1].context as Toast).message
			);
			expect(messages).toEqual(["One", "Two", "Three"]);
			expect(loadLibrary).toHaveBeenCalledOnce();
		});

		it("keeps ids in call order across queued toasts and pendings", async () => {
			await setUpLazy(gatedLoader());

			lazy.info("One");
			const id = lazy.pending({ message: "Two", onCommit: vi.fn() });
			lazy.info("Three");
			release();
			await vi.advanceTimersByTimeAsync(0);

			const ids = manager.show.mock.calls.map(
				call => (call[1].context as Toast).id
			);
			expect(ids).toEqual([1, id, 3]);
		});

		it("does not show a queued pending that was undone before the import ended", async () => {
			await setUpLazy(gatedLoader());
			const onUndo = vi.fn();
			const onCommit = vi.fn();
			const id = lazy.pending({ message: "x", onCommit, onUndo });

			lazy.undo(id);
			release();
			await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS);

			expect(manager.show).not.toHaveBeenCalled();
			expect(onUndo).toHaveBeenCalledOnce();
			expect(onCommit).not.toHaveBeenCalled();
		});

		it("commits a pending whose window ends before the import does", async () => {
			await setUpLazy(gatedLoader());
			const onCommit = vi.fn();
			lazy.pending({ message: "x", onCommit });

			await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS);
			release();
			await vi.advanceTimersByTimeAsync(0);

			expect(onCommit).toHaveBeenCalledOnce();
			expect(manager.show).not.toHaveBeenCalled();
		});

		it("survives a failed import and retries on the next call", async () => {
			let attempts = 0;
			await setUpLazy(() =>
				++attempts === 1
					? Promise.reject(new Error("offline"))
					: Promise.resolve(fakeLibrary())
			);

			lazy.info("Lost?");
			await vi.advanceTimersByTimeAsync(0);
			expect(manager.show).not.toHaveBeenCalled();

			lazy.info("Again");
			await vi.advanceTimersByTimeAsync(0);

			const messages = manager.show.mock.calls.map(
				call => (call[1].context as Toast).message
			);
			expect(messages).toEqual(["Lost?", "Again"]);
			expect(loadLibrary).toHaveBeenCalledTimes(2);
		});

		it("imports once when the idle preload overlaps a manual call", async () => {
			await setUpLazy(gatedLoader());

			await vi.advanceTimersByTimeAsync(IDLE_PRELOAD_MS);
			lazy.info("During");
			lazy.info("Also during");
			release();
			await vi.advanceTimersByTimeAsync(0);
			await vi.advanceTimersByTimeAsync(IDLE_PRELOAD_MS);

			expect(loadLibrary).toHaveBeenCalledOnce();
			expect(manager.show).toHaveBeenCalledTimes(2);
		});

		it("shows synchronously once the library is loaded", async () => {
			await setUpLazy(() => Promise.resolve(fakeLibrary()));
			await vi.advanceTimersByTimeAsync(IDLE_PRELOAD_MS);

			lazy.info("Now");

			expect(manager.show).toHaveBeenCalledOnce();
		});

		it("drops queued toasts when the app is destroyed before the import ends", async () => {
			await setUpLazy(gatedLoader());

			lazy.info("Too late");
			TestBed.resetTestingModule();
			release();
			await vi.advanceTimersByTimeAsync(IDLE_PRELOAD_MS);
			lazy.info("After destroy");
			await vi.advanceTimersByTimeAsync(0);

			expect(manager.show).not.toHaveBeenCalled();
			expect(loadLibrary).toHaveBeenCalledOnce();
		});

		it("destroys the toast manager with the app so no toast outlives it", async () => {
			await setUpLazy(() => Promise.resolve(fakeLibrary()));
			lazy.info("Visible");
			await vi.advanceTimersByTimeAsync(0);
			expect(manager.destroyed).not.toHaveBeenCalled();

			TestBed.resetTestingModule();

			expect(manager.destroyed).toHaveBeenCalledOnce();
		});
	});
});
