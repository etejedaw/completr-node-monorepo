import {
	createEnvironmentInjector,
	DestroyRef,
	EnvironmentInjector,
	inject,
	Injectable,
	InjectionToken,
	type TemplateRef
} from "@angular/core";
import type * as ToastLibraryModule from "ng-primitives/toast";
import type { NgpToastManager, NgpToastRef } from "ng-primitives/toast";

export type ToastVariant = "info" | "success" | "warning" | "error" | "premium";

export const TOAST_CONFIG = {
	placement: "bottom-end",
	offsetRight: 16,
	offsetBottom: 16,
	mobileTabBarClearance: 80,
	gap: 8,
	maxToasts: 4,
	durationMs: 4000,
	premiumDurationMs: 5000,
	undoWindowMs: 5000
} as const;

export const UNDO_WINDOW_MS = TOAST_CONFIG.undoWindowMs;

type ToastLibrary = typeof ToastLibraryModule;

export const TOAST_LIBRARY_LOADER = new InjectionToken<
	() => Promise<ToastLibrary>
>("TOAST_LIBRARY_LOADER", {
	providedIn: "root",
	factory: () => () => import("ng-primitives/toast")
});

const PRELOAD_FALLBACK_DELAY_MS = 2000;

function toastOffsetBottom(): number {
	const isMobile =
		typeof window !== "undefined" &&
		window.matchMedia?.("(max-width: 767px)").matches;
	return isMobile
		? TOAST_CONFIG.mobileTabBarClearance
		: TOAST_CONFIG.offsetBottom;
}

function whenIdle(task: () => void) {
	if (typeof window === "undefined") return;
	if (typeof window.requestIdleCallback === "function") {
		window.requestIdleCallback(task);
		return;
	}
	setTimeout(task, PRELOAD_FALLBACK_DELAY_MS);
}

export interface Toast {
	id: number;
	title?: string;
	message: string;
	variant: ToastVariant;
	undoLabel?: string;
	durationMs?: number;
	onUndo?: () => void;
	onDismiss?: () => void;
}

interface PendingEntry {
	ref: NgpToastRef | null;
	timer: ReturnType<typeof setTimeout>;
	onCommit: () => void;
	onUndo?: () => void;
	committed: boolean;
}

export interface PendingToastOptions {
	message: string;
	onCommit: () => void;
	onUndo?: () => void;
	undoLabel?: string;
	variant?: ToastVariant;
}

@Injectable({ providedIn: "root" })
export class ToastService {
	private readonly injector = inject(EnvironmentInjector);
	private readonly loadLibrary = inject(TOAST_LIBRARY_LOADER);
	private manager: NgpToastManager | null = null;
	private loading: Promise<void> | null = null;
	private readonly waiting: ((manager: NgpToastManager) => void)[] = [];
	private template: TemplateRef<void> | null = null;
	private nextId = 1;
	private readonly pendings = new Map<number, PendingEntry>();
	private readonly shownByContent = new Map<string, NgpToastRef>();
	private toastInjector: EnvironmentInjector | null = null;
	private destroyed = false;

	constructor() {
		inject(DestroyRef).onDestroy(() => {
			this.destroyed = true;
			this.waiting.length = 0;
			this.toastInjector?.destroy();
		});
		whenIdle(() => this.load());
	}

	registerTemplate(tpl: TemplateRef<unknown>) {
		this.template = tpl as TemplateRef<void>;
	}

	show(
		message: string,
		variant: ToastVariant = "info",
		durationMs: number = TOAST_CONFIG.durationMs,
		title?: string
	) {
		if (!this.template) return;
		const id = this.nextId++;
		const ctx: Toast = {
			id,
			title,
			message,
			variant
		};
		const template = this.template;
		const contentKey = [variant, title ?? "", message].join("\u0000");
		this.whenReady(manager => {
			this.shownByContent.get(contentKey)?.dismiss();
			const ref = manager.show(template, {
				duration: durationMs,
				context: ctx
			});
			this.shownByContent.set(contentKey, ref);
			ctx.onDismiss = () => ref.dismiss();
		});
	}

	info(message: string, durationMs?: number) {
		this.show(message, "info", durationMs);
	}

	success(message: string, durationMs?: number) {
		this.show(message, "success", durationMs);
	}

	warning(message: string, durationMs?: number) {
		this.show(message, "warning", durationMs);
	}

	error(message: string, durationMs?: number) {
		this.show(message, "error", durationMs);
	}

	premium(
		title: string,
		message: string,
		durationMs: number = TOAST_CONFIG.premiumDurationMs
	) {
		this.show(message, "premium", durationMs, title);
	}

	pending(opts: PendingToastOptions): number {
		if (!this.template) return -1;
		const id = this.nextId++;
		const durationMs = UNDO_WINDOW_MS;
		const ctx: Toast = {
			id,
			message: opts.message,
			variant: opts.variant ?? "info",
			undoLabel: opts.undoLabel ?? "Undo",
			durationMs,
			onUndo: () => this.undo(id),
			onDismiss: () => this.dismiss(id)
		};
		const template = this.template;
		const timer = setTimeout(() => this.commit(id), durationMs);
		const entry: PendingEntry = {
			ref: null,
			timer,
			onCommit: opts.onCommit,
			onUndo: opts.onUndo,
			committed: false
		};
		this.pendings.set(id, entry);
		this.whenReady(manager => {
			if (entry.committed) return;
			entry.ref = manager.show(template, {
				persistent: true,
				dismissible: false,
				context: ctx
			});
		});
		return id;
	}

	undo(id: number) {
		const entry = this.pendings.get(id);
		if (!entry || entry.committed) return;
		clearTimeout(entry.timer);
		entry.committed = true;
		this.pendings.delete(id);
		entry.ref?.dismiss();
		entry.onUndo?.();
	}

	dismiss(id: number) {
		const entry = this.pendings.get(id);
		if (entry) {
			this.commit(id);
		}
	}

	private whenReady(task: (manager: NgpToastManager) => void) {
		if (this.manager) {
			task(this.manager);
			return;
		}
		this.waiting.push(task);
		this.load();
	}

	private load() {
		if (this.manager || this.loading || this.destroyed) return;
		this.loading = this.loadLibrary()
			.then(({ NgpToastManager, provideToastConfig }) => {
				if (this.destroyed) return;
				const injector = createEnvironmentInjector(
					[
						provideToastConfig({
							placement: TOAST_CONFIG.placement,
							offsetBottom: toastOffsetBottom(),
							offsetRight: TOAST_CONFIG.offsetRight,
							gap: TOAST_CONFIG.gap,
							maxToasts: TOAST_CONFIG.maxToasts,
							ariaLive: "polite"
						}),
						NgpToastManager
					],
					this.injector
				);
				this.toastInjector = injector;
				const manager = injector.get(NgpToastManager);
				this.manager = manager;
				this.loading = null;
				this.waiting.splice(0).forEach(task => task(manager));
			})
			.catch(() => {
				this.loading = null;
			});
	}

	private commit(id: number) {
		const entry = this.pendings.get(id);
		if (!entry || entry.committed) return;
		clearTimeout(entry.timer);
		entry.committed = true;
		this.pendings.delete(id);
		entry.ref?.dismiss();
		entry.onCommit();
	}
}
