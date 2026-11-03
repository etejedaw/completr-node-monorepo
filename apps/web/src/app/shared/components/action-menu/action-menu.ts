import { NgTemplateOutlet } from "@angular/common";
import {
	booleanAttribute,
	ChangeDetectionStrategy,
	Component,
	computed,
	ElementRef,
	inject,
	input,
	output,
	signal,
	viewChild
} from "@angular/core";
import { NgpMenu, NgpMenuItem, NgpMenuTrigger } from "ng-primitives/menu";

import { ViewportService } from "../../../core/services/viewport";
import { UiBottomSheet, UiCountBadge } from "../../ui";
import { UiButton } from "../../ui/button/ui-button";
import {
	type ActionMenuItem,
	type ActionMenuVariant
} from "./action-menu.model";

@Component({
	selector: "app-action-menu",
	imports: [
		NgTemplateOutlet,
		NgpMenu,
		NgpMenuItem,
		NgpMenuTrigger,
		UiBottomSheet,
		UiButton,
		UiCountBadge
	],
	templateUrl: "./action-menu.html",
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActionMenu {
	readonly label = input.required<string>();
	readonly heading = input.required<string>();
	readonly items = input.required<readonly ActionMenuItem[]>();
	readonly icon = input("more_horiz");
	readonly iconOnly = input(false);
	readonly placement = input<"toolbar" | "hero">("toolbar");
	readonly variant = input<ActionMenuVariant>("secondary");
	readonly size = input<"md" | "lg" | null>(null);
	readonly busy = input(false);
	readonly count = input(0);
	readonly active = input(false, { transform: booleanAttribute });
	readonly eyebrow = input<string | null>(null);
	readonly subheading = input<string | null>(null);
	readonly selected = output<string>();

	private readonly trigger = viewChild.required("trigger", {
		read: ElementRef<HTMLButtonElement>
	});

	protected readonly isMobile = inject(ViewportService).isMobile;
	protected readonly sheetOpen = signal(false);
	protected readonly buttonVariant = computed(() =>
		this.placement() === "hero" && this.variant() === "secondary"
			? "glass"
			: this.variant()
	);

	protected readonly accessibleName = computed(() => {
		const count = this.count();
		if (count > 0) return `${this.label()}, ${count} active`;
		return this.iconOnly() ? this.label() : null;
	});

	focusTrigger() {
		this.trigger().nativeElement.focus({ preventScroll: true });
	}

	protected openSheet() {
		if (this.isMobile()) this.sheetOpen.set(true);
	}

	protected select(item: ActionMenuItem) {
		if (item.disabled || item.busy) return;
		this.sheetOpen.set(false);
		this.selected.emit(item.id);
	}
}
