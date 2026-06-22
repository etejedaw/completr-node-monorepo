import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	TemplateRef,
	viewChild
} from "@angular/core";
import { NgpToast } from "ng-primitives/toast";
import { Toast, ToastService } from "../../../core/services/toast.service";

@Component({
	selector: "app-toast-container",
	imports: [NgpToast],
	templateUrl: "./toast-container.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastContainer implements OnInit {
	private readonly toastService = inject(ToastService);
	private readonly tpl = viewChild.required<TemplateRef<{ $implicit: Toast }>>("tpl");

	ngOnInit() {
		this.toastService.registerTemplate(this.tpl());
	}

	protected iconFor(variant: Toast["variant"]): string {
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

	protected classesFor(variant: Toast["variant"]): string {
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
