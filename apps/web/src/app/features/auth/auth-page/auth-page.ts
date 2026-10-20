import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";

import { AuthShowcase } from "../auth-showcase/auth-showcase";

@Component({
	selector: "app-auth-page",
	imports: [AuthShowcase, RouterLink],
	template: `
		<div
			class="min-h-screen bg-canvas lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(26rem,1fr)]"
		>
			<app-auth-showcase
				class="h-64 sm:h-80 lg:h-auto lg:min-h-screen lg:sticky lg:top-0 border-b lg:border-b-0 lg:border-r border-line"
			/>

			<main
				class="relative flex flex-col justify-center px-5 sm:px-10 lg:px-16 py-10 lg:py-16"
			>
				<div
					aria-hidden="true"
					class="pointer-events-none absolute -top-32 right-0 w-96 h-96 rounded-full blur-3xl opacity-40 bg-[radial-gradient(circle,var(--color-brand-glow),transparent_65%)]"
				></div>

				<div class="relative w-full max-w-sm mx-auto lg:mx-0">
					<span
						class="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-brand"
						>{{ eyebrow() }}</span
					>
					<h1
						class="m-0 mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight leading-tight"
					>
						{{ heading() }}
					</h1>
					<p class="m-0 mt-2 mb-8 text-sm text-fg-muted">
						{{ subtitle() }}
					</p>

					<ng-content />

					<div
						class="mt-6 pt-6 border-t border-line flex flex-wrap items-center justify-between gap-3 text-xs text-fg-muted"
					>
						<a
							routerLink="/privacy"
							class="text-fg-secondary no-underline hover:text-brand"
							>Privacy Policy</a
						>
						<span>
							Made with ♥ by
							<a
								href="https://www.etejeda.dev"
								target="_blank"
								rel="noopener noreferrer"
								class="text-fg-secondary no-underline hover:text-brand"
								>Esteban Tejeda</a
							>
						</span>
					</div>
				</div>
			</main>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthPage {
	readonly eyebrow = input.required<string>();
	readonly heading = input.required<string>();
	readonly subtitle = input.required<string>();
}
