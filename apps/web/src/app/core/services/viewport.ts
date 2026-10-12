import { Injectable, signal } from "@angular/core";

const MOBILE_QUERY = "(max-width: 767px)";

@Injectable({ providedIn: "root" })
export class ViewportService {
	private readonly mobileQuery =
		typeof window !== "undefined" && "matchMedia" in window
			? window.matchMedia(MOBILE_QUERY)
			: null;

	private readonly mobileState = signal(this.mobileQuery?.matches ?? false);

	readonly isMobile = this.mobileState.asReadonly();

	constructor() {
		this.mobileQuery?.addEventListener("change", event =>
			this.mobileState.set(event.matches)
		);
	}
}
