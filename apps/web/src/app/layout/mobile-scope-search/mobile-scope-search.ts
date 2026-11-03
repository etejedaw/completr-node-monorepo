import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	output
} from "@angular/core";

import { PageSearchScope } from "../../core/services/page-search-scope";
import { SearchScopeChip } from "../search-scope-chip/search-scope-chip";

@Component({
	selector: "app-mobile-scope-search",
	imports: [SearchScopeChip],
	template: `
		@if (scope(); as activeScope) {
			<div role="search" class="min-w-0">
				<label
					class="flex items-center gap-2 min-h-[44px] pl-3 pr-1 rounded-full bg-surface/70 border border-line transition focus-within:border-brand focus-within:bg-input-bg focus-within:shadow-ring-brand"
				>
					<span
						aria-hidden="true"
						class="material-icons text-xl text-fg-muted"
						[class.!text-brand]="activeScope.value()"
						>search</span
					>
					<app-search-scope-chip
						[label]="activeScope.label()"
						(removed)="searchEverywhere()"
					/>
					<input
						type="search"
						enterkeyhint="search"
						autocomplete="off"
						class="flex-1 min-w-0 bg-transparent border-0 outline-none text-fg text-base placeholder:text-fg-muted [&::-webkit-search-cancel-button]:hidden"
						[placeholder]="activeScope.placeholder()"
						[attr.aria-label]="activeScope.ariaLabel()"
						[value]="activeScope.value()"
						(input)="onInput($event)"
						(keydown.backspace)="onBackspace($event)"
						(keydown.escape)="onEscape($event)"
						(keydown.enter)="blur($event)"
					/>
					@if (activeScope.value()) {
						<button
							type="button"
							class="inline-flex items-center justify-center shrink-0 w-[44px] h-[44px] -my-px rounded-full bg-transparent border-0 p-0 text-fg-muted cursor-pointer transition hover:text-fg focus-visible:outline-2 focus-visible:outline-brand"
							aria-label="Clear search"
							(click)="clear($event)"
						>
							<span
								aria-hidden="true"
								class="material-icons text-lg"
								>close</span
							>
						</button>
					}
				</label>
				<p role="status" class="sr-only">
					Filtering {{ activeScope.label() }}
				</p>
			</div>
		}
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileScopeSearch {
	private readonly pageSearchScope = inject(PageSearchScope);

	readonly searchedEverywhere = output<string>();

	protected readonly scope = computed(() => this.pageSearchScope.active());

	protected onInput(event: Event) {
		this.scope()?.setValue((event.target as HTMLInputElement).value);
	}

	protected onBackspace(event: Event) {
		if ((event.target as HTMLInputElement).value !== "") return;
		event.preventDefault();
		this.searchEverywhere();
	}

	protected onEscape(event: Event) {
		const field = event.target as HTMLInputElement;
		if (this.scope()?.value()) {
			this.scope()?.setValue("");
			return;
		}
		field.blur();
	}

	protected blur(event: Event) {
		(event.target as HTMLInputElement).blur();
	}

	protected clear(event: Event) {
		this.scope()?.setValue("");
		const field = (event.currentTarget as HTMLElement)
			.closest("label")
			?.querySelector("input");
		field?.focus();
	}

	protected searchEverywhere() {
		const scope = this.scope();
		if (!scope) return;
		const query = scope.value();
		scope.setValue("");
		this.searchedEverywhere.emit(query);
	}
}
