import { booleanAttribute, Directive, input } from "@angular/core";

@Directive({
	selector: "table[uiTable]",
	host: {
		class: "w-full border-collapse text-[0.8125rem] [&_thead_th]:whitespace-nowrap [&_thead_th]:border-b [&_thead_th]:border-line [&_thead_th]:px-3 [&_thead_th]:py-2.5 [&_thead_th]:text-left [&_thead_th]:text-[0.6875rem] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.14em] [&_thead_th]:text-fg-muted [&_thead_th[data-highlighted]]:font-bold [&_thead_th[data-highlighted]]:text-brand [&_thead_th[data-highlighted]:hover]:text-brand-deep [&_tbody_tr]:border-b [&_tbody_tr]:border-line [&_tbody_tr]:transition [&_tbody_tr:hover]:bg-surface-hover [&_tbody_tr[aria-selected=true]]:bg-brand-subtle [&_tbody_tr[aria-selected=true]:hover]:bg-brand-subtle [&_tbody_tr[aria-selected=true]>td:first-child]:shadow-[inset_3px_0_0_var(--color-brand)] [&_tbody_td]:px-3 [&_tbody_td]:py-2.5 [&_tbody_td]:align-middle [&_:is(th,td)[data-align=end]]:text-right [&[data-framed]_tbody_tr:last-child]:border-b-0",
		"[attr.data-framed]": "framed() ? '' : null"
	}
})
export class UiTable {
	readonly framed = input(false, { transform: booleanAttribute });
}
