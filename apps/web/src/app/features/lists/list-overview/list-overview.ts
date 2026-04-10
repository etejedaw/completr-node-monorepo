import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
	selector: "app-list-overview",
	template: "<p>Lists works!</p>",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListOverview {}
