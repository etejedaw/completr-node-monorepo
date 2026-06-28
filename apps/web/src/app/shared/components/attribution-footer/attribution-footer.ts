import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
	selector: "app-attribution-footer",
	imports: [RouterLink],
	template: `
		<footer
			class="px-6 lg:px-8 py-4 border-t border-line text-[0.6875rem] text-fg-muted leading-relaxed"
		>
			<p class="m-0">
				Game data and images provided by
				<a
					href="https://rawg.io"
					target="_blank"
					rel="noopener"
					class="text-fg-secondary hover:text-brand no-underline"
					>RAWG.io</a
				>,
				<a
					href="https://howlongtobeat.com"
					target="_blank"
					rel="noopener"
					class="text-fg-secondary hover:text-brand no-underline"
					>HowLongToBeat</a
				>
				and
				<a
					href="https://www.metacritic.com"
					target="_blank"
					rel="noopener"
					class="text-fg-secondary hover:text-brand no-underline"
					>Metacritic</a
				>. Used per their respective API terms.
			</p>
			<p class="m-0 mt-1.5">
				<a
					routerLink="/privacy"
					class="text-fg-secondary hover:text-brand no-underline"
					>Privacy Policy</a
				>
			</p>
		</footer>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttributionFooter {}
