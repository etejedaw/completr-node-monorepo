import { Injectable, signal } from "@angular/core";

export type ToastVariant = "info" | "success" | "warning" | "error";

export interface Toast {
	id: number;
	message: string;
	variant: ToastVariant;
}

@Injectable({ providedIn: "root" })
export class ToastService {
	private nextId = 1;
	private readonly _toasts = signal<Toast[]>([]);
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

	dismiss(id: number) {
		this._toasts.update(list => list.filter(t => t.id !== id));
	}
}
