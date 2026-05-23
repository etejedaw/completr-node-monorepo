import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { AttributionFooter } from "../../shared/components/attribution-footer/attribution-footer";

@Component({
	selector: "app-guest-shell",
	standalone: true,
	imports: [RouterOutlet, AttributionFooter],
	template: `
		<div class="min-h-screen flex flex-col bg-canvas">
			<div class="flex-1">
				<router-outlet />
			</div>
			<app-attribution-footer />
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GuestShell {}
