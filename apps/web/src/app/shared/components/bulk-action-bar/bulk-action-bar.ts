import { DOCUMENT } from "@angular/common";
import {
	afterRenderEffect,
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	ElementRef,
	inject,
	input,
	output
} from "@angular/core";

import { ViewportService } from "../../../core/services/viewport";
import { UiButton, UiIconButton } from "../../ui";
import { ActionMenu } from "../action-menu/action-menu";
import { type ActionMenuItem } from "../action-menu/action-menu.model";
import { type BulkAction, type BulkItemNoun } from "./bulk-action-bar.model";

const MOBILE_PRIMARY_LIMIT = 3;
const BAR_HEIGHT_PX = 56;
const DESKTOP_BOTTOM_OFFSET_PX = 16;
const MOBILE_BOTTOM_OFFSET_PX = 8;
const FOCUS_CLEARANCE_PX = 8;
const DESKTOP_BAR_CLEARANCE = `${BAR_HEIGHT_PX + DESKTOP_BOTTOM_OFFSET_PX + FOCUS_CLEARANCE_PX}px`;
const MOBILE_BAR_CLEARANCE = `calc(${BAR_HEIGHT_PX + MOBILE_BOTTOM_OFFSET_PX + FOCUS_CLEARANCE_PX}px + var(--tabbar-height) + env(safe-area-inset-bottom))`;
const OVERLAY_SELECTOR = "[role='dialog'], [role='menu'], [role='listbox']";
const OPEN_ATTRIBUTE = "data-bulk-bar-open";
const CLEARANCE_PROPERTY = "--bulk-bar-clearance";

@Component({
	selector: "app-bulk-action-bar",
	imports: [ActionMenu, UiButton, UiIconButton],
	templateUrl: "./bulk-action-bar.html",
	host: {
		class: "sticky z-30 flex justify-center pointer-events-none bottom-[16px] max-md:bottom-[calc(var(--tabbar-height)+env(safe-area-inset-bottom)+8px)]",
		"(document:keydown.escape)": "clearOnEscape($event)"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BulkActionBar {
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
	private readonly document = inject(DOCUMENT);
	protected readonly isMobile = inject(ViewportService).isMobile;

	readonly count = input.required<number>();
	readonly actions = input.required<readonly BulkAction[]>();
	readonly noun = input.required<BulkItemNoun>();
	readonly busy = input(false);

	readonly actionTriggered = output<string>();
	readonly cleared = output<void>();

	protected readonly isOpen = computed(() => this.count() > 0);

	protected readonly selectionText = computed(() => {
		const count = this.count();
		if (count === 0) return "";
		return `${count} ${this.nounFor(count)} selected`;
	});

	protected readonly nounText = computed(() => this.nounFor(this.count()));

	private readonly mainActions = computed(() =>
		this.actions().filter(
			action => action.tone !== "danger" && !action.overflow
		)
	);

	protected readonly primaryActions = computed(() =>
		this.isMobile()
			? this.mainActions().slice(0, MOBILE_PRIMARY_LIMIT)
			: this.mainActions()
	);

	protected readonly dangerActions = computed(() =>
		this.actions().filter(action => action.tone === "danger")
	);

	protected readonly moreItems = computed<ActionMenuItem[]>(() => {
		const collapsed = this.isMobile()
			? this.mainActions().slice(MOBILE_PRIMARY_LIMIT)
			: [];
		const overflow = this.actions().filter(
			action => action.tone !== "danger" && action.overflow
		);
		return [...collapsed, ...overflow].map(action => ({
			id: action.id,
			label: this.labelOf(action),
			icon: action.icon,
			disabled: this.busy() || action.eligibleCount === 0
		}));
	});

	constructor() {
		afterRenderEffect(() => {
			const clearance = this.isOpen()
				? this.isMobile()
					? MOBILE_BAR_CLEARANCE
					: DESKTOP_BAR_CLEARANCE
				: "";
			const scroller = this.scroller();
			if (scroller) scroller.style.scrollPaddingBottom = clearance;
			this.reserveSpaceForToasts(clearance);
		});
		inject(DestroyRef).onDestroy(() => {
			const scroller = this.scroller();
			if (scroller) scroller.style.scrollPaddingBottom = "";
			this.reserveSpaceForToasts("");
		});
	}

	protected labelOf(action: BulkAction): string {
		return `${action.label} (${action.eligibleCount})`;
	}

	protected isDisabled(action: BulkAction): boolean {
		return this.busy() || action.eligibleCount === 0;
	}

	protected trigger(action: BulkAction) {
		if (this.isDisabled(action)) return;
		this.actionTriggered.emit(action.id);
	}

	protected triggerFromMenu(id: string) {
		if (this.busy()) return;
		this.actionTriggered.emit(id);
	}

	protected clearOnEscape(event: Event) {
		if (!this.isOpen() || event.defaultPrevented) return;
		const target = event.target as Element | null;
		if (target?.closest?.(OVERLAY_SELECTOR)) return;
		this.cleared.emit();
	}

	private nounFor(count: number): string {
		return count === 1 ? this.noun().one : this.noun().other;
	}

	private reserveSpaceForToasts(clearance: string) {
		const root = this.document.documentElement;
		if (clearance) {
			root.setAttribute(OPEN_ATTRIBUTE, "");
			root.style.setProperty(CLEARANCE_PROPERTY, clearance);
			return;
		}
		root.removeAttribute(OPEN_ATTRIBUTE);
		root.style.removeProperty(CLEARANCE_PROPERTY);
	}

	private scroller(): HTMLElement | null {
		return this.host.nativeElement.closest<HTMLElement>(".page-scroller");
	}
}
