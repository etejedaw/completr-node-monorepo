import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";

const DATA_SOURCES = [
	{ name: "RAWG.io", url: "https://rawg.io" },
	{ name: "HowLongToBeat", url: "https://howlongtobeat.com" },
	{ name: "Metacritic", url: "https://www.metacritic.com" }
] as const;

const FOOTER_LINK_CLASSES =
	"inline-flex items-center max-sm:px-2 tap:min-h-[44px] pointer-coarse:px-2 text-fg-secondary hover:text-brand no-underline";

@Component({
	selector: "app-attribution-footer",
	imports: [RouterLink],
	template: `
		<footer
			class="px-6 lg:px-8 py-4 border-t border-line text-[0.6875rem] text-fg-muted leading-relaxed"
		>
			<p class="m-0">
				Game data and images provided by these services, used per their
				respective API terms:
			</p>
			<ul
				class="m-0 mt-1.5 p-0 list-none flex flex-wrap items-center gap-x-4 gap-y-1 max-sm:mt-1 max-sm:-mx-2 pointer-coarse:mt-1 pointer-coarse:-mx-2 tap:gap-[8px]"
			>
				@for (source of dataSources; track source.name) {
					<li>
						<a
							[href]="source.url"
							target="_blank"
							rel="noopener"
							[class]="linkClasses"
							>{{ source.name }}</a
						>
					</li>
				}
				<li>
					<a routerLink="/privacy" [class]="linkClasses"
						>Privacy Policy</a
					>
				</li>
			</ul>
		</footer>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttributionFooter {
	protected readonly dataSources = DATA_SOURCES;
	protected readonly linkClasses = FOOTER_LINK_CLASSES;
}
