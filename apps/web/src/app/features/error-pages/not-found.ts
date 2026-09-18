import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { UiButton } from "../../shared/ui";

@Component({
	selector: "app-not-found",
	imports: [RouterLink, UiButton],
	template: `
		<div
			class="flex flex-col items-center justify-center min-h-[60vh] text-center p-8"
		>
			<span class="text-6xl font-extrabold text-brand leading-none mb-2"
				>404</span
			>
			<h1 class="font-display text-2xl font-bold mb-2">Page not found</h1>
			<p class="text-fg-muted text-sm mb-6">
				The page you're looking for doesn't exist or has been moved.
			</p>
			<a uiButton variant="primary" routerLink="/">Go to Feed</a>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotFound {}
