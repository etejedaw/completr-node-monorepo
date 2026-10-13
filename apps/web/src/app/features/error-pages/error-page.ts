import { Location } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	inject,
	input
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { UiButton } from "../../shared/ui";

@Component({
	selector: "app-error-page",
	imports: [RouterLink, UiButton],
	template: `
		<section
			class="relative isolate flex flex-col items-center justify-center min-h-[70vh] text-center px-4 py-16"
			[attr.aria-labelledby]="'error-title-' + code()"
		>
			<div
				aria-hidden="true"
				class="absolute left-1/2 top-1/2 -z-10 h-72 w-72 sm:h-96 sm:w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/15 blur-3xl"
			></div>
			<span
				class="inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-brand"
			>
				<span aria-hidden="true" class="material-icons text-sm">{{
					icon()
				}}</span>
				Error {{ code() }}
			</span>
			<p
				aria-hidden="true"
				class="font-display m-0 mt-2 text-[7rem] sm:text-[11rem] font-bold leading-none tracking-tighter tabular-nums bg-gradient-to-b from-fg via-fg/60 to-fg/5 bg-clip-text text-transparent select-none"
			>
				{{ code() }}
			</p>
			<h1
				class="font-display m-0 mt-2 text-2xl sm:text-3xl font-bold tracking-tight"
				[id]="'error-title-' + code()"
			>
				{{ title() }}
			</h1>
			<p class="m-0 mt-3 max-w-md text-sm text-fg-secondary">
				{{ message() }}
			</p>
			<div
				class="mt-8 flex flex-wrap items-center justify-center gap-2 tap:gap-[8px]"
			>
				<a
					uiButton
					variant="primary"
					routerLink="/feed"
					class="max-sm:min-h-[44px]"
				>
					<span aria-hidden="true" class="material-icons text-base"
						>dynamic_feed</span
					>
					Go to Feed
				</a>
				<a
					uiButton
					variant="secondary"
					routerLink="/games"
					class="max-sm:min-h-[44px]"
				>
					<span aria-hidden="true" class="material-icons text-base"
						>explore</span
					>
					Browse games
				</a>
				<button
					uiButton
					variant="ghost"
					type="button"
					class="max-sm:min-h-[44px]"
					(click)="goBack()"
				>
					<span aria-hidden="true" class="material-icons text-base"
						>arrow_back</span
					>
					Go back
				</button>
			</div>
		</section>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorPage {
	private readonly location = inject(Location);

	readonly code = input.required<string>();
	readonly icon = input.required<string>();
	readonly title = input.required<string>();
	readonly message = input.required<string>();

	protected goBack() {
		this.location.back();
	}
}
