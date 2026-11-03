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
import { RouterLink } from "@angular/router";
import { NgpMenu, NgpMenuItem, NgpMenuTrigger } from "ng-primitives/menu";

import { ViewportService } from "../../../core/services/viewport";
import { UiBottomSheet, UiCountBadge } from "../../ui";
import { UiButton } from "../../ui/button/ui-button";
import {
	type ActionMenuItem,
	type ActionMenuLink,
	type ActionMenuVariant
} from "./action-menu.model";

const MENU_ITEM_CLASS =
	"w-full flex items-center gap-2.5 min-h-9 px-2.5 rounded bg-transparent border-0 text-left text-sm text-fg-secondary no-underline outline-none cursor-pointer hover:bg-surface-hover hover:text-fg focus-visible:bg-surface-hover focus-visible:text-fg data-[disabled]:opacity-40 data-[disabled]:cursor-default";

const SHEET_ITEM_CLASS =
	"w-full min-h-14 flex items-center gap-3 px-4 rounded-card bg-transparent border-0 text-base font-medium text-fg text-left no-underline cursor-pointer transition active:bg-surface disabled:opacity-40 disabled:cursor-default";

@Component({
	selector: "app-action-menu",
	imports: [
		NgTemplateOutlet,
		NgpMenu,
		NgpMenuItem,
		NgpMenuTrigger,
		RouterLink,
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
	protected readonly menuItemClass = MENU_ITEM_CLASS;
	protected readonly sheetItemClass = SHEET_ITEM_CLASS;
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

	protected linkOf(item: ActionMenuItem): ActionMenuLink | null {
		if (item.disabled || item.busy) return null;
		return item.link ?? null;
	}

	protected closeSheet() {
		this.sheetOpen.set(false);
	}

	protected select(item: ActionMenuItem) {
		if (item.disabled || item.busy) return;
		this.closeSheet();
		this.selected.emit(item.id);
	}
}
