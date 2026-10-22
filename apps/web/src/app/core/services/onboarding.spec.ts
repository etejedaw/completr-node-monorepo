import { TestBed } from "@angular/core/testing";

import { OnboardingService } from "./onboarding";

const STORAGE_KEY = "completr.onboarding.done";

describe("OnboardingService", () => {
	let onboarding: OnboardingService;

	beforeEach(() => {
		localStorage.clear();
		onboarding = TestBed.inject(OnboardingService);
	});

	it("starts closed", () => {
		expect(onboarding.isOpen()).toBe(false);
	});

	it("opens on the first visit", () => {
		onboarding.maybeStartForFirstTime();

		expect(onboarding.isOpen()).toBe(true);
	});

	it("stays closed when the tour was already completed", () => {
		localStorage.setItem(STORAGE_KEY, "1");

		onboarding.maybeStartForFirstTime();

		expect(onboarding.isOpen()).toBe(false);
	});

	it("opens on demand even when it was completed", () => {
		localStorage.setItem(STORAGE_KEY, "1");

		onboarding.open();

		expect(onboarding.isOpen()).toBe(true);
	});

	it("closes and remembers the tour when dismissed with persist", () => {
		onboarding.open();

		onboarding.dismiss(true);

		expect(onboarding.isOpen()).toBe(false);
		expect(localStorage.getItem(STORAGE_KEY)).toBe("1");
	});

	it("closes without remembering the tour when dismissed without persist", () => {
		onboarding.open();

		onboarding.dismiss(false);

		expect(onboarding.isOpen()).toBe(false);
		expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
	});
});
