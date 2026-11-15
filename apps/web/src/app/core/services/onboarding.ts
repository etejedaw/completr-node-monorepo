import { inject, Injectable, signal } from "@angular/core";

import { StorageService } from "./storage";

const STORAGE_KEY = "completr.onboarding.done";

@Injectable({ providedIn: "root" })
export class OnboardingService {
	private readonly storage = inject(StorageService);
	private readonly _isOpen = signal(false);
	readonly isOpen = this._isOpen.asReadonly();

	maybeStartForFirstTime() {
		if (this.storage.get(STORAGE_KEY) === "1") return;
		this._isOpen.set(true);
	}

	open() {
		this._isOpen.set(true);
	}

	dismiss(persist: boolean) {
		this._isOpen.set(false);
		if (persist) this.storage.set(STORAGE_KEY, "1");
	}
}
