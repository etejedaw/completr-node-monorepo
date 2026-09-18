import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { RouterOutlet } from "@angular/router";
import { SwUpdate, type VersionReadyEvent } from "@angular/service-worker";
import { filter, fromEvent, interval, merge } from "rxjs";

const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

@Component({
	selector: "app-root",
	imports: [RouterOutlet],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: "<router-outlet />"
})
export class App {
	private readonly swUpdate = inject(SwUpdate);

	constructor() {
		if (!this.swUpdate.isEnabled) return;

		this.swUpdate.versionUpdates
			.pipe(
				filter(
					(event): event is VersionReadyEvent =>
						event.type === "VERSION_READY"
				),
				takeUntilDestroyed()
			)
			.subscribe(() => {
				this.swUpdate
					.activateUpdate()
					.then(() => document.location.reload())
					.catch(error => {
						console.warn("SwUpdate.activateUpdate failed", error);
					});
			});

		this.swUpdate.unrecoverable
			.pipe(takeUntilDestroyed())
			.subscribe(event => {
				console.warn("SW unrecoverable state, reloading", event.reason);
				document.location.reload();
			});

		merge(interval(UPDATE_CHECK_INTERVAL_MS), fromEvent(window, "focus"))
			.pipe(takeUntilDestroyed())
			.subscribe(() => {
				this.swUpdate.checkForUpdate().catch(error => {
					console.warn("SwUpdate.checkForUpdate failed", error);
				});
			});
	}
}
