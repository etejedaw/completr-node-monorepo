import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { ToastService } from "../../../core/services/toast.service";

@Component({
	selector: "app-toast-container",
	templateUrl: "./toast-container.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastContainer {
	private readonly toastService = inject(ToastService);
	protected readonly toasts = this.toastService.toasts;

	dismiss(id: number) {
		this.toastService.dismiss(id);
	}

	iconFor(variant: string): string {
		switch (variant) {
			case "success":
				return "check_circle";
			case "warning":
				return "warning";
			case "error":
				return "error";
			default:
				return "info";
		}
	}

	classesFor(variant: string): string {
		switch (variant) {
			case "success":
				return "bg-success/10 border-success/30 text-success";
			case "warning":
				return "bg-warning/10 border-warning/30 text-warning";
			case "error":
				return "bg-danger/10 border-danger/30 text-danger";
			default:
				return "bg-brand-subtle border-brand/30 text-brand";
		}
	}
}
