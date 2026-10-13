import { ChangeDetectionStrategy, Component } from "@angular/core";

import { ErrorPage } from "./error-page";

@Component({
	selector: "app-not-found",
	imports: [ErrorPage],
	template: `
		<app-error-page
			code="404"
			icon="travel_explore"
			title="Page not found"
			message="This page doesn't exist or has been moved. Check the address, or head back to your feed."
		/>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotFound {}
