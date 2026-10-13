import { ChangeDetectionStrategy, Component } from "@angular/core";

import { ErrorPage } from "./error-page";

@Component({
	selector: "app-forbidden",
	imports: [ErrorPage],
	template: `
		<app-error-page
			code="403"
			icon="lock"
			title="Access denied"
			message="Your account doesn't have permission to view this page. If you think it should, send feedback from the About page."
		/>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Forbidden {}
