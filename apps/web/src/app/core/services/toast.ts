import { inject, Injectable, type TemplateRef } from "@angular/core";
import { NgpToastManager, type NgpToastRef } from "ng-primitives/toast";

export type ToastVariant = "info" | "success" | "warning" | "error" | "premium";

export const UNDO_WINDOW_MS = 5000;

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
	ref: NgpToastRef;
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
	private readonly manager = inject(NgpToastManager);
	private template: TemplateRef<void> | null = null;
	private nextId = 1;
	private readonly pendings = new Map<number, PendingEntry>();

	registerTemplate(tpl: TemplateRef<unknown>) {
		this.template = tpl as TemplateRef<void>;
	}

	show(
		message: string,
		variant: ToastVariant = "info",
		durationMs = 4000,
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
		const ref = this.manager.show(this.template, {
			duration: durationMs,
			context: ctx
		});
		ctx.onDismiss = () => ref.dismiss();
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

	premium(title: string, message: string, durationMs = 5000) {
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
		const ref = this.manager.show(this.template, {
			persistent: true,
			dismissible: false,
			context: ctx
		});
		const timer = setTimeout(() => this.commit(id), durationMs);
		this.pendings.set(id, {
			ref,
			timer,
			onCommit: opts.onCommit,
			onUndo: opts.onUndo,
			committed: false
		});
		return id;
	}

	undo(id: number) {
		const entry = this.pendings.get(id);
		if (!entry || entry.committed) return;
		clearTimeout(entry.timer);
		entry.committed = true;
		this.pendings.delete(id);
		entry.ref.dismiss();
		entry.onUndo?.();
	}

	dismiss(id: number) {
		const entry = this.pendings.get(id);
		if (entry) {
			this.commit(id);
		}
	}

	private commit(id: number) {
		const entry = this.pendings.get(id);
		if (!entry || entry.committed) return;
		clearTimeout(entry.timer);
		entry.committed = true;
		this.pendings.delete(id);
		entry.ref.dismiss();
		entry.onCommit();
	}
}
