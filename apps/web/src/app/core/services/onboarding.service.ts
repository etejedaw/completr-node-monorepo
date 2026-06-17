import { Injectable, signal } from "@angular/core";

const STORAGE_KEY = "completr.onboarding.done";

@Injectable({ providedIn: "root" })
export class OnboardingService {
	private readonly _isOpen = signal(false);
	readonly isOpen = this._isOpen.asReadonly();

	maybeStartForFirstTime() {
		if (typeof localStorage === "undefined") return;
		if (localStorage.getItem(STORAGE_KEY) === "1") return;
		this._isOpen.set(true);
	}

	open() {
		this._isOpen.set(true);
	}

	dismiss(persist: boolean) {
		this._isOpen.set(false);
		if (persist && typeof localStorage !== "undefined") {
			localStorage.setItem(STORAGE_KEY, "1");
		}
	}
}
