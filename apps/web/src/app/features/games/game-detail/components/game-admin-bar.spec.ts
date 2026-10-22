import { TestBed } from "@angular/core/testing";

import { type AdminActionsState, GameAdminBar } from "./game-admin-bar";

const idleState: AdminActionsState = {
	confirmDeactivate: false,
	confirmDelete: false,
	editor: false,
	deactivating: false,
	deleting: false
};

describe("GameAdminBar", () => {
	function render(state: Partial<AdminActionsState> = {}, isAdmin = true) {
		const fixture = TestBed.createComponent(GameAdminBar);
		fixture.componentRef.setInput("state", { ...idleState, ...state });
		fixture.componentRef.setInput("isAdmin", isAdmin);
		fixture.detectChanges();
		const element = fixture.nativeElement as HTMLElement;
		const events = {
			state: vi.fn(),
			deactivate: vi.fn(),
			remove: vi.fn()
		};
		fixture.componentInstance.stateChanged.subscribe(events.state);
		fixture.componentInstance.deactivateConfirmed.subscribe(
			events.deactivate
		);
		fixture.componentInstance.deleteConfirmed.subscribe(events.remove);
		return { element, events };
	}

	function button(element: HTMLElement, text: string) {
		return Array.from(element.querySelectorAll("button")).find(b =>
			b.textContent?.includes(text)
		) as HTMLButtonElement;
	}

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [GameAdminBar] });
	});

	it("labels the bar as Admin for admins and Moderator otherwise", () => {
		expect(render().element.textContent).toContain("Admin");
		expect(render({}, false).element.textContent).toContain("Moderator");
	});

	it("only offers the editor to moderators", () => {
		const { element } = render({}, false);

		expect(button(element, "Edit game")).toBeTruthy();
		expect(button(element, "Deactivate")).toBeUndefined();
		expect(button(element, "Delete")).toBeUndefined();
	});

	it("toggles the editor through stateChanged", () => {
		const closed = render();
		button(closed.element, "Edit game").click();
		expect(closed.events.state).toHaveBeenCalledWith({ editor: true });

		const open = render({ editor: true });
		button(open.element, "Close editor").click();
		expect(open.events.state).toHaveBeenCalledWith({ editor: false });
	});

	it("asks for confirmation before deactivating", () => {
		const { element, events } = render();

		button(element, "Deactivate").click();

		expect(events.state).toHaveBeenCalledWith({ confirmDeactivate: true });
		expect(events.deactivate).not.toHaveBeenCalled();
	});

	it("asks for confirmation before deleting", () => {
		const { element, events } = render();

		button(element, "Delete").click();

		expect(events.state).toHaveBeenCalledWith({ confirmDelete: true });
		expect(events.remove).not.toHaveBeenCalled();
	});

	it("confirms or cancels a deactivation", () => {
		const { element, events } = render({ confirmDeactivate: true });

		expect(element.textContent).toContain("Deactivate this game?");
		expect(button(element, "Delete")).toBeUndefined();
		button(element, "Yes").click();
		expect(events.deactivate).toHaveBeenCalledTimes(1);
		button(element, "Cancel").click();
		expect(events.state).toHaveBeenCalledWith({
			confirmDeactivate: false
		});
	});

	it("confirms or cancels a deletion", () => {
		const { element, events } = render({ confirmDelete: true });

		expect(element.textContent).toContain("Permanently delete this game?");
		button(element, "Yes, delete").click();
		expect(events.remove).toHaveBeenCalledTimes(1);
		button(element, "Cancel").click();
		expect(events.state).toHaveBeenCalledWith({ confirmDelete: false });
	});

	it("disables the confirm button while deactivating", () => {
		const { element } = render({
			confirmDeactivate: true,
			deactivating: true
		});

		const pending = button(element, "Deactivating...");
		expect(pending.disabled).toBe(true);
	});

	it("disables the confirm button while deleting", () => {
		const { element } = render({ confirmDelete: true, deleting: true });

		const pending = button(element, "Deleting...");
		expect(pending.disabled).toBe(true);
	});
});
