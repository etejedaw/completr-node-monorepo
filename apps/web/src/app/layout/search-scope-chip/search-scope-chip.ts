import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";

@Component({
	selector: "app-search-scope-chip",
	template: `
		<span class="truncate">In {{ label() }}</span>
		<button
			type="button"
			class="tap-area relative inline-flex items-center justify-center w-5 h-5 rounded-full bg-transparent border-0 p-0 text-brand-hover cursor-pointer transition hover:bg-brand-subtle hover:text-fg focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-1"
			aria-label="Search all of Completr instead"
			title="Search all of Completr instead"
			(click)="removed.emit()"
		>
			<span aria-hidden="true" class="material-icons text-[0.95rem]"
				>close</span
			>
		</button>
	`,
	host: {
		class: "inline-flex items-center gap-1 shrink-0 max-w-[45%] h-[26px] pl-2.5 pr-1 rounded-full bg-brand-subtle border border-brand/40 text-brand-hover text-xs font-bold whitespace-nowrap"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchScopeChip {
	readonly label = input.required<string>();
	readonly removed = output<void>();
}
