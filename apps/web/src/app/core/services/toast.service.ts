import { Injectable, signal } from "@angular/core";

export type ToastVariant = "info" | "success" | "warning" | "error";

export interface Toast {
	id: number;
	message: string;
	variant: ToastVariant;
	undoLabel?: string;
	durationMs?: number;
}

interface PendingEntry {
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
	durationMs?: number;
	variant?: ToastVariant;
}

@Injectable({ providedIn: "root" })
export class ToastService {
	private nextId = 1;
	private readonly _toasts = signal<Toast[]>([]);
	private readonly pendings = new Map<number, PendingEntry>();
	readonly toasts = this._toasts.asReadonly();

	show(message: string, variant: ToastVariant = "info", durationMs = 4000) {
		const id = this.nextId++;
		this._toasts.update(list => [...list, { id, message, variant }]);
		setTimeout(() => this.dismiss(id), durationMs);
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

	pending(opts: PendingToastOptions): number {
		const id = this.nextId++;
		const durationMs = opts.durationMs ?? 5000;
		const entry: PendingEntry = {
			timer: setTimeout(() => this.commit(id), durationMs),
			onCommit: opts.onCommit,
			onUndo: opts.onUndo,
			committed: false
		};
		this.pendings.set(id, entry);
		this._toasts.update(list => [
			...list,
			{
				id,
				message: opts.message,
				variant: opts.variant ?? "info",
				undoLabel: opts.undoLabel ?? "Undo",
				durationMs
			}
		]);
		return id;
	}

	undo(id: number) {
		const entry = this.pendings.get(id);
		if (!entry || entry.committed) return;
		clearTimeout(entry.timer);
		entry.committed = true;
		this.pendings.delete(id);
		this._toasts.update(list => list.filter(t => t.id !== id));
		entry.onUndo?.();
	}

	dismiss(id: number) {
		const entry = this.pendings.get(id);
		if (entry) {
			this.commit(id);
			return;
		}
		this._toasts.update(list => list.filter(t => t.id !== id));
	}

	private commit(id: number) {
		const entry = this.pendings.get(id);
		if (!entry || entry.committed) return;
		clearTimeout(entry.timer);
		entry.committed = true;
		this.pendings.delete(id);
		this._toasts.update(list => list.filter(t => t.id !== id));
		entry.onCommit();
	}
}
