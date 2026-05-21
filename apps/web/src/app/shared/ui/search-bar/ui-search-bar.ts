import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	input,
	model,
	viewChild
} from "@angular/core";

@Component({
	selector: "ui-search-bar",
	template: `
		<div
			class="flex items-center bg-input-bg border border-line rounded-card px-4 transition focus-within:border-brand focus-within:shadow-[0_0_0_3px_var(--color-brand-subtle)]"
		>
			<span class="material-icons text-xl text-fg-muted">search</span>
			<input
				#input
				type="text"
				class="flex-1 bg-transparent border-0 px-2.5 py-3 text-fg text-base outline-none placeholder:text-fg-muted"
				[placeholder]="placeholder()"
				[value]="value()"
				(input)="onInput($event)"
				(keydown.escape)="clear()"
			/>
			@if (value()) {
				<button
					type="button"
					class="material-icons text-lg text-fg-muted hover:text-fg transition cursor-pointer"
					aria-label="Clear search"
					(click)="clear()"
				>
					close
				</button>
			}
		</div>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiSearchBar {
	value = model("");
	placeholder = input("Search...");

	private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>("input");

	protected onInput(event: Event) {
		this.value.set((event.target as HTMLInputElement).value);
	}

	protected clear() {
		this.value.set("");
		this.inputRef()?.nativeElement.focus();
	}
}
