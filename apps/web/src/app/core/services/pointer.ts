import { Injectable, signal } from "@angular/core";

const COARSE_POINTER_QUERY = "(pointer: coarse)";

@Injectable({ providedIn: "root" })
export class PointerService {
	private readonly coarseQuery =
		typeof window !== "undefined" && "matchMedia" in window
			? window.matchMedia(COARSE_POINTER_QUERY)
			: null;

	private readonly coarseState = signal(this.coarseQuery?.matches ?? false);

	readonly isCoarse = this.coarseState.asReadonly();

	constructor() {
		this.coarseQuery?.addEventListener("change", event =>
			this.coarseState.set(event.matches)
		);
	}
}
