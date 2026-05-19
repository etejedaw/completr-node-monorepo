import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { UiButton } from "../../shared/ui";

@Component({
	selector: "app-forbidden",
	imports: [RouterLink, UiButton],
	template: `
		<div class="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
			<span class="text-6xl font-extrabold text-danger leading-none mb-2">403</span>
			<h1 class="font-display text-2xl font-bold mb-2">Access denied</h1>
			<p class="text-fg-muted text-sm mb-6">You don't have permission to view this page.</p>
			<a uiButton variant="primary" routerLink="/">Go to Feed</a>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Forbidden {}
