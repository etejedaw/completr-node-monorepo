import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
	selector: "app-backlog-list",
	template: "<p>Backlog works!</p>",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogList {}
