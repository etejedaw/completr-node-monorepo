import { DOCUMENT } from "@angular/common";
import {
	afterNextRender,
	Directive,
	effect,
	ElementRef,
	inject,
	Injector,
	input,
	output
} from "@angular/core";

const TRIGGER_SELECTOR = '[aria-haspopup="menu"]';
const ENABLED_ITEM_SELECTOR = '[role="menuitem"]:not(:disabled)';

@Directive({
	selector: "[appMenuKeyboard]",
	host: {
		"(keydown)": "onKeydown($event)"
	}
})
export class MenuKeyboard {
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
	private readonly document = inject(DOCUMENT);
	private readonly injector = inject(Injector);

	readonly menuOpen = input.required<boolean>({
		alias: "appMenuKeyboard"
	});
	readonly menuClosed = output<void>();

	constructor() {
		effect(onCleanup => {
			if (!this.menuOpen()) return;
			afterNextRender(() => this.enabledItems()[0]?.focus(), {
				injector: this.injector
			});
			const closeOnEscape = (event: KeyboardEvent) => {
				if (event.key !== "Escape") return;
				this.trigger()?.focus();
				this.menuClosed.emit();
			};
			this.document.addEventListener("keydown", closeOnEscape);
			onCleanup(() =>
				this.document.removeEventListener("keydown", closeOnEscape)
			);
		});
	}

	protected onKeydown(event: KeyboardEvent) {
		if (!this.menuOpen() || event.ctrlKey || event.altKey || event.metaKey)
			return;
		switch (event.key) {
			case "ArrowDown":
				this.focusItem(event, this.nextIndex(1));
				break;
			case "ArrowUp":
				this.focusItem(event, this.nextIndex(-1));
				break;
			case "Home":
				this.focusItem(event, 0);
				break;
			case "End":
				this.focusItem(event, this.enabledItems().length - 1);
				break;
			case "Tab":
				this.leaveMenu(event.shiftKey);
				break;
		}
	}

	private nextIndex(step: 1 | -1): number {
		const items = this.enabledItems();
		const current = items.indexOf(
			this.document.activeElement as HTMLElement
		);
		if (current === -1) return step === 1 ? 0 : items.length - 1;
		return (current + step + items.length) % items.length;
	}

	private focusItem(event: KeyboardEvent, index: number) {
		event.preventDefault();
		this.enabledItems()[index]?.focus();
	}

	private leaveMenu(backwards: boolean) {
		const landing = backwards ? this.trigger() : this.enabledItems().at(-1);
		landing?.focus();
		this.menuClosed.emit();
	}

	private trigger(): HTMLElement | null {
		return this.host.nativeElement.querySelector<HTMLElement>(
			TRIGGER_SELECTOR
		);
	}

	private enabledItems(): HTMLElement[] {
		return Array.from(
			this.host.nativeElement.querySelectorAll<HTMLElement>(
				ENABLED_ITEM_SELECTOR
			)
		);
	}
}
