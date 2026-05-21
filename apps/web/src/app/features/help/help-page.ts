import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
	selector: "app-help-page",
	standalone: true,
	imports: [RouterLink],
	templateUrl: "./help-page.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelpPage {}
