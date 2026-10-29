import { type NgpToastRef } from "ng-primitives/toast";

export type ToastVariant = "info" | "success" | "warning" | "error" | "premium";

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

export interface PendingEntry {
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
