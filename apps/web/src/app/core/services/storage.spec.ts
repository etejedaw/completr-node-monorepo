import { TestBed } from "@angular/core/testing";

import { StorageService } from "./storage";

describe("StorageService", () => {
	let storage: StorageService;

	beforeEach(() => {
		localStorage.clear();
		storage = TestBed.inject(StorageService);
	});

	it("returns null for a missing key", () => {
		expect(storage.get("missing")).toBeNull();
	});

	it("stores and reads a value through localStorage", () => {
		storage.set("key", "value");

		expect(storage.get("key")).toBe("value");
		expect(localStorage.getItem("key")).toBe("value");
	});

	it("removes a stored value", () => {
		storage.set("key", "value");

		storage.remove("key");

		expect(storage.get("key")).toBeNull();
	});
});
