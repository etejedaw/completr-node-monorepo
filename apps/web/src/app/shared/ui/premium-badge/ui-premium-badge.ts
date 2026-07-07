import {
	ChangeDetectionStrategy,
	Component,
	booleanAttribute,
	inject,
	input
} from "@angular/core";
import { ToastService } from "../../../core/services/toast";

@Component({
	selector: "ui-premium-badge",
	template: `@if (interactive()) {
			<button
				type="button"
				class="material-icons text-warning leading-none inline-flex items-center align-middle bg-transparent border-0 p-0 m-0 cursor-pointer transition hover:opacity-70"
				[class.text-base]="size() === 'md'"
				[class.text-sm]="size() === 'sm'"
				[attr.aria-label]="label()"
				[attr.title]="label()"
				(click)="onPress($event)"
			>
				workspace_premium
			</button>
		} @else {
			<span
				class="material-icons text-warning leading-none inline-flex items-center align-middle cursor-help"
				[class.text-base]="size() === 'md'"
				[class.text-sm]="size() === 'sm'"
				[attr.aria-label]="label()"
				[attr.title]="label()"
				>workspace_premium</span
			>
		}`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiPremiumBadge {
	private readonly toast = inject(ToastService);

	size = input<"sm" | "md">("md");
	label = input("Premium");
	message = input("");
	interactive = input(false, { transform: booleanAttribute });

	onPress(event: Event) {
		event.stopPropagation();
		this.toast.info(this.message() || this.label());
	}
}
