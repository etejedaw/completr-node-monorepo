import { Component, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { SwUpdate, VersionReadyEvent } from "@angular/service-worker";
import { filter } from "rxjs";

@Component({
	selector: "app-root",
	imports: [RouterOutlet],
	template: "<router-outlet />"
})
export class App {
	private readonly swUpdate = inject(SwUpdate);

	constructor() {
		if (this.swUpdate.isEnabled) {
			this.swUpdate.versionUpdates
				.pipe(
					filter(
						(event): event is VersionReadyEvent =>
							event.type === "VERSION_READY"
					)
				)
				.subscribe(() => {
					this.swUpdate
						.activateUpdate()
						.then(() => document.location.reload());
				});
		}
	}
}
