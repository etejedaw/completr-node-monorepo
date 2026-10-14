import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { RouterLink, RouterOutlet } from "@angular/router";

import { AppLogo } from "../../shared/components/app-logo/app-logo";
import { AttributionFooter } from "../../shared/components/attribution-footer/attribution-footer";
import { UiButton } from "../../shared/ui";

@Component({
	selector: "app-guest-shell",
	imports: [RouterOutlet, RouterLink, AppLogo, AttributionFooter, UiButton],
	template: `
		<main
			id="main-content"
			class="page-scroller h-dvh overflow-y-auto overflow-x-hidden bg-canvas flex flex-col"
			(scroll)="onScroll($any($event.target).scrollTop)"
		>
			<header
				class="sticky top-0 z-40 shrink-0 h-[var(--topbar-height)] -mb-[var(--topbar-height)] border-b transition-[background-color,border-color] duration-200"
				[class]="
					scrolled()
						? 'bg-canvas/80 backdrop-blur-xl border-line'
						: 'border-transparent'
				"
			>
				<div
					class="h-full max-w-[var(--page-max-width)] mx-auto flex items-center gap-3 px-[var(--page-pad-x)]"
				>
					<a
						href="https://www.completr.app"
						class="flex items-center min-h-[44px] no-underline"
						aria-label="Completr"
					>
						<app-logo />
					</a>
					<nav
						class="ml-auto flex items-center gap-2"
						aria-label="Account"
					>
						<a
							routerLink="/login"
							class="inline-flex items-center h-10 tap:min-h-[44px] px-3 rounded-card text-sm font-medium text-fg-secondary no-underline transition hover:text-fg hover:bg-surface/70"
							>Sign in</a
						>
						<a
							uiButton
							variant="primary"
							size="lg"
							routerLink="/register"
							class="h-10 tap:min-h-[44px] font-semibold shadow-lg shadow-brand/25"
							>Create account</a
						>
					</nav>
				</div>
			</header>
			<div class="page-shell flex-1">
				<router-outlet />
			</div>
			<app-attribution-footer />
		</main>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GuestShell {
	protected readonly scrolled = signal(false);

	protected onScroll(scrollTop: number): void {
		const scrolled = scrollTop > 8;
		if (scrolled !== this.scrolled()) this.scrolled.set(scrolled);
	}
}
