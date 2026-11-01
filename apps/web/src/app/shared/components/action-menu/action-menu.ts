import { NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	inject,
	input,
	output,
	signal
} from "@angular/core";
import { NgpMenu, NgpMenuItem, NgpMenuTrigger } from "ng-primitives/menu";

import { ViewportService } from "../../../core/services/viewport";
import { UiBottomSheet } from "../../ui";
import { UiButton } from "../../ui/button/ui-button";
import { type ActionMenuItem } from "./action-menu.model";

@Component({
	selector: "app-action-menu",
	imports: [
		NgTemplateOutlet,
		NgpMenu,
		NgpMenuItem,
		NgpMenuTrigger,
		UiBottomSheet,
		UiButton
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
	readonly variant = input<"primary" | "secondary">("secondary");
	readonly size = input<"md" | "lg" | null>(null);
	readonly busy = input(false);
	readonly selected = output<string>();

	protected readonly isMobile = inject(ViewportService).isMobile;
	protected readonly sheetOpen = signal(false);

	protected openSheet() {
		if (this.isMobile()) this.sheetOpen.set(true);
	}

	protected select(item: ActionMenuItem) {
		if (item.disabled || item.busy) return;
		this.sheetOpen.set(false);
		this.selected.emit(item.id);
	}
}
