import { TestBed } from "@angular/core/testing";
import { NgpDialogManager } from "ng-primitives/dialog";
import { Subject } from "rxjs";

import { DialogService } from "./dialog";

class FakeDialog {
	readonly marker = true;
}

class OtherDialog {
	readonly marker = true;
}

function fakeRef(id: string) {
	return { id, afterClosed: new Subject<unknown>() };
}

describe("DialogService", () => {
	const manager = { open: vi.fn(), closeAll: vi.fn() };
	let dialog: DialogService;

	beforeEach(() => {
		manager.open.mockReset().mockImplementation(() => fakeRef("ref"));
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
		expect(ref.id).toBe("ref");
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

	it("returns the open dialog instead of stacking a second copy on a double click", () => {
		const first = dialog.open(FakeDialog);
		const second = dialog.open(FakeDialog);

		expect(second).toBe(first);
		expect(manager.open).toHaveBeenCalledOnce();
	});

	it("opens the same dialog again once the previous one has closed", () => {
		const first = dialog.open(FakeDialog) as unknown as ReturnType<
			typeof fakeRef
		>;
		first.afterClosed.next(undefined);
		first.afterClosed.complete();

		dialog.open(FakeDialog);

		expect(manager.open).toHaveBeenCalledTimes(2);
	});

	it("still opens a different dialog while another one is open", () => {
		dialog.open(FakeDialog);
		dialog.open(OtherDialog);

		expect(manager.open).toHaveBeenCalledTimes(2);
	});
});
