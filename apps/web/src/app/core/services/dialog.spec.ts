import { TestBed } from "@angular/core/testing";
import { NgpDialogManager } from "ng-primitives/dialog";

import { DialogService } from "./dialog";

class FakeDialog {
	readonly marker = true;
}

describe("DialogService", () => {
	const manager = { open: vi.fn(), closeAll: vi.fn() };
	let dialog: DialogService;

	beforeEach(() => {
		manager.open.mockReset().mockReturnValue({ id: "ref" });
		manager.closeAll.mockReset();
		TestBed.configureTestingModule({
			providers: [{ provide: NgpDialogManager, useValue: manager }]
		});
		dialog = TestBed.inject(DialogService);
	});

	it("opens a modal dialog that closes on navigation but not on escape", () => {
		const ref = dialog.open(FakeDialog);

		expect(manager.open).toHaveBeenCalledWith(FakeDialog, {
			modal: true,
			closeOnEscape: false,
			closeOnNavigation: true
		});
		expect(ref).toEqual({ id: "ref" });
	});

	it("lets the caller override the defaults", () => {
		dialog.open(FakeDialog, { closeOnEscape: true, data: { id: 1 } });

		expect(manager.open).toHaveBeenCalledWith(FakeDialog, {
			modal: true,
			closeOnEscape: true,
			closeOnNavigation: true,
			data: { id: 1 }
		});
	});

	it("closes every dialog", () => {
		dialog.closeAll();

		expect(manager.closeAll).toHaveBeenCalledOnce();
	});
});
