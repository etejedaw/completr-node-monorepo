import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { ToastService } from "../../../core/services/toast";
import { AdminUsers } from "./admin-users";

const api = environment.apiUrl;
const USERS_URL = `${api}/admin/users`;
const INVITATIONS_URL = `${api}/admin/invitations`;

function makeUser(index: number, overrides: Record<string, unknown> = {}) {
	return {
		id: `u${index}`,
		username: `user${index}`,
		email: `user${index}@example.com`,
		name: `User Number ${index}`,
		role: "user",
		isActive: true,
		profileVisibility: "public",
		createdAt: "2026-02-03T00:00:00.000Z",
		...overrides
	};
}

const ADA = makeUser(1, {
	username: "ada",
	email: "ada@example.com",
	name: "Ada Lovelace",
	role: "admin"
});
const BOB = makeUser(2, {
	username: "bob",
	email: "bob@example.com",
	name: "Bob Builder",
	isActive: false
});
const USERS = [ADA, BOB];

const INVITATIONS = [
	{
		id: "i1",
		email: "pending@example.com",
		createdAt: "2026-03-01T00:00:00.000Z",
		expiresAt: "2026-03-08T00:00:00.000Z",
		isExpired: false
	},
	{
		id: "i2",
		email: "expired@example.com",
		createdAt: "2026-01-01T00:00:00.000Z",
		expiresAt: "2026-01-08T00:00:00.000Z",
		isExpired: true
	}
];

const toast = {
	success: vi.fn(),
	warning: vi.fn(),
	error: vi.fn(),
	info: vi.fn()
};

type Http = HttpTestingController;
type User = ReturnType<typeof userEvent.setup>;

describe("Admin users interaction", () => {
	let http: Http;

	beforeEach(() => {
		Object.values(toast).forEach(fn => fn.mockReset());
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: false,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		}));
	});

	afterEach(() => {
		http.match(() => true).forEach(req => {
			if (!req.cancelled) req.flush(null);
		});
		vi.unstubAllGlobals();
	});

	function pending(method: string, url: string) {
		return http.match(req => req.method === method && req.url === url);
	}

	function listRequests() {
		return pending("GET", USERS_URL);
	}

	function invitationListRequests() {
		return pending("GET", INVITATIONS_URL);
	}

	function flushUsers(
		request: TestRequest,
		users: unknown[] = USERS,
		total = users.length
	) {
		request.flush({ data: { users, total } });
	}

	function flushInvitations(
		request: TestRequest,
		invitations: unknown[] = []
	) {
		request.flush({ data: { invitations } });
	}

	function fail(
		request: TestRequest,
		status: number,
		body: object | null = null
	) {
		if (status === 0) {
			request.error(new ProgressEvent("error"), { status: 0 });
			return;
		}
		request.flush(body, { status, statusText: "Error" });
	}

	async function renderUsers(
		users: unknown[] = USERS,
		invitations: unknown[] = [],
		total = users.length
	) {
		const view = await render(AdminUsers, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: ToastService, useValue: toast }
			]
		});
		http = TestBed.inject(HttpTestingController);
		flushInvitations(invitationListRequests()[0]!, invitations);
		flushUsers(listRequests()[0]!, users, total);
		view.fixture.detectChanges();
		return view;
	}

	async function openCreate(user: User) {
		await user.click(screen.getByRole("button", { name: /Create User/ }));
		return screen.findByRole("dialog", { name: "Create user" });
	}

	async function openEdit(user: User, username = "bob") {
		await user.click(
			screen.getAllByRole("button", { name: `Edit ${username}` })[0]!
		);
		return screen.findByRole("dialog", { name: "Edit user" });
	}

	async function openInvite(user: User) {
		await user.click(
			screen.getByRole("button", { name: /Invite by email/ })
		);
		return screen.findByRole("dialog", { name: "Invite by email" });
	}

	async function fillCreate(
		user: User,
		dialog: HTMLElement,
		values: Partial<
			Record<"username" | "name" | "email" | "password", string>
		> = {}
	) {
		const data = {
			username: "newuser",
			name: "New Person",
			email: "new@example.com",
			password: "Passw0rd!",
			...values
		};
		for (const [label, text] of [
			["Username", data.username],
			["Name", data.name],
			["Email", data.email],
			["Password", data.password]
		] as const) {
			const input = within(dialog).getByLabelText(
				new RegExp(`^${label}`)
			);
			await user.clear(input);
			if (text) await user.type(input, text);
		}
	}

	function submitCreateButton(dialog: HTMLElement) {
		return within(dialog).getByRole("button", {
			name: /^(Create User|Creating\.\.\.)$/
		});
	}

	function submitEditButton(dialog: HTMLElement) {
		return within(dialog).getByRole("button", {
			name: /^(Save Changes|Saving\.\.\.)$/
		});
	}

	describe("listing and pagination", () => {
		it("lists users with role, status and mobile rows", async () => {
			await renderUsers();
			expect(screen.getAllByText("Ada Lovelace").length).toBeGreaterThan(
				0
			);
			expect(screen.getAllByText("Admin").length).toBeGreaterThan(0);
			expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);
			expect(screen.getByText("2")).toBeInTheDocument();
		});

		it("shows skeletons while loading and an error with Try again on 500", async () => {
			const user = userEvent.setup();
			await render(AdminUsers, {
				providers: [
					provideHttpClient(),
					provideHttpClientTesting(),
					{ provide: ToastService, useValue: toast }
				]
			});
			http = TestBed.inject(HttpTestingController);
			flushInvitations(invitationListRequests()[0]!);
			expect(screen.getByLabelText("Loading users")).toBeInTheDocument();

			fail(listRequests()[0]!, 500);
			expect(
				await screen.findByText("Could not load the users.")
			).toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "Try again" }));
			expect(screen.getByLabelText("Loading users")).toBeInTheDocument();
			flushUsers(listRequests()[0]!);
			expect(
				(await screen.findAllByText("Ada Lovelace")).length
			).toBeGreaterThan(0);
			expect(
				screen.queryByText("Could not load the users.")
			).not.toBeInTheDocument();
		});

		it("recovers from a network failure and from a second failure", async () => {
			const user = userEvent.setup();
			await render(AdminUsers, {
				providers: [
					provideHttpClient(),
					provideHttpClientTesting(),
					{ provide: ToastService, useValue: toast }
				]
			});
			http = TestBed.inject(HttpTestingController);
			flushInvitations(invitationListRequests()[0]!);
			fail(listRequests()[0]!, 0);
			await user.click(
				await screen.findByRole("button", { name: "Try again" })
			);
			fail(listRequests()[0]!, 503);
			await user.click(
				await screen.findByRole("button", { name: "Try again" })
			);
			flushUsers(listRequests()[0]!);
			expect(
				(await screen.findAllByText("Bob Builder")).length
			).toBeGreaterThan(0);
		});

		it("shows the empty state and opens Create from it", async () => {
			const user = userEvent.setup();
			await renderUsers([]);
			expect(screen.getByText("No users found")).toBeInTheDocument();
			const buttons = screen.getAllByRole("button", {
				name: "Create User"
			});
			await user.click(buttons[buttons.length - 1]!);
			expect(
				await screen.findByRole("dialog", { name: "Create user" })
			).toBeInTheDocument();
		});

		it("asks for the next page with the right offset and goes back to page 1", async () => {
			const user = userEvent.setup();
			const page1 = Array.from({ length: 50 }, (_, i) =>
				makeUser(i + 10)
			);
			await renderUsers(page1, [], 120);

			await user.click(screen.getByRole("button", { name: "Next page" }));
			const second = listRequests();
			expect(second).toHaveLength(1);
			expect(second[0]!.request.params.get("offset")).toBe("50");
			expect(second[0]!.request.params.get("limit")).toBe("50");
			flushUsers(second[0]!, [makeUser(99)], 120);

			expect(
				(await screen.findAllByText("user99")).length
			).toBeGreaterThan(0);
			await user.click(
				screen.getByRole("button", { name: "First page" })
			);
			expect(listRequests()[0]!.request.params.get("offset")).toBe("0");
		});

		it("keeps the user on the failed page and lets them retry after a page error", async () => {
			const user = userEvent.setup();
			await renderUsers(
				Array.from({ length: 50 }, (_, i) => makeUser(i + 10)),
				[],
				120
			);
			await user.click(screen.getByRole("button", { name: "Next page" }));
			fail(listRequests()[0]!, 500);
			await user.click(
				await screen.findByRole("button", { name: "Try again" })
			);
			const retry = listRequests()[0]!;
			expect(retry.request.params.get("offset")).toBe("50");
			flushUsers(retry, [makeUser(77)], 120);
			expect(
				(await screen.findAllByText("user77")).length
			).toBeGreaterThan(0);
		});

		it("creating a user returns to the first page and reloads", async () => {
			const user = userEvent.setup();
			await renderUsers(
				Array.from({ length: 50 }, (_, i) => makeUser(i + 10)),
				[],
				120
			);
			await user.click(screen.getByRole("button", { name: "Next page" }));
			flushUsers(listRequests()[0]!, [makeUser(99)], 120);
			await screen.findAllByText("user99");

			const dialog = await openCreate(user);
			await fillCreate(user, dialog);
			await user.click(submitCreateButton(dialog));
			pending("POST", USERS_URL)[0]!.flush({
				data: { user: makeUser(500) }
			});

			await waitFor(() => expect(listRequests()).toHaveLength(1));
		});
	});

	describe("create dialog", () => {
		it("submitting an empty form explains every missing field and sends nothing", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openCreate(user);

			await user.click(submitCreateButton(dialog));

			expect(pending("POST", USERS_URL)).toHaveLength(0);
			const alert = within(dialog).getByRole("alert");
			expect(alert).toHaveTextContent("Username is required.");
			expect(alert).toHaveTextContent("Email is required.");
			expect(alert).toHaveTextContent("Name is required.");
			expect(alert).toHaveTextContent("Password is required.");
			expect(
				within(dialog).getAllByText("Username is required.").length
			).toBeGreaterThan(0);
		});

		it("explains username, email, name and password problems field by field", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openCreate(user);

			await fillCreate(user, dialog, {
				username: "Ada!",
				name: "<b>",
				email: "not-an-email",
				password: "short"
			});
			await user.click(submitCreateButton(dialog));

			const alert = within(dialog).getByRole("alert");
			expect(alert).toHaveTextContent(
				"only lowercase letters, digits, dots or underscores"
			);
			expect(alert).toHaveTextContent("Email is not valid.");
			expect(alert).toHaveTextContent("Name must not contain < or >");
			expect(alert).toHaveTextContent(
				"Password must be between 8 and 15"
			);
			expect(pending("POST", USERS_URL)).toHaveLength(0);
		});

		it.each([
			[
				"alllowercase1!",
				"Password must contain at least one uppercase letter."
			],
			[
				"ALLUPPER1!",
				"Password must contain at least one lowercase letter."
			],
			["NoNumbers!!", "Password must contain at least one number."],
			[
				"NoSpecial123",
				"Password must contain at least one special character."
			]
		])("rejects password %s", async (password, message) => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openCreate(user);
			await fillCreate(user, dialog, { password });
			await user.click(submitCreateButton(dialog));
			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				message
			);
			expect(pending("POST", USERS_URL)).toHaveLength(0);
		});

		it.each([
			["abc", "Username must be between 4 and 15 characters."],
			[
				"ÁDA_ñandú",
				"only lowercase letters, digits, dots or underscores"
			],
			[
				"with space",
				"only lowercase letters, digits, dots or underscores"
			],
			["🎮🎮🎮🎮", "only lowercase letters, digits, dots or underscores"]
		])("rejects username %j", async (username, message) => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openCreate(user);
			await fillCreate(user, dialog, { username });
			await user.click(submitCreateButton(dialog));
			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				message
			);
			expect(pending("POST", USERS_URL)).toHaveLength(0);
		});

		it("rejects a name made only of spaces instead of sending it to the server", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openCreate(user);
			await fillCreate(user, dialog, { name: "     " });
			await user.click(submitCreateButton(dialog));

			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				"Name is required."
			);
			expect(pending("POST", USERS_URL)).toHaveLength(0);
		});

		it("corrects the form after an error and submits the fixed values", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openCreate(user);
			await fillCreate(user, dialog, {
				email: "nope",
				password: "short"
			});
			await user.click(submitCreateButton(dialog));
			expect(within(dialog).getByRole("alert")).toBeInTheDocument();

			await fillCreate(user, dialog);
			await user.click(submitCreateButton(dialog));

			expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
			const [post] = pending("POST", USERS_URL);
			expect(post!.request.body).toEqual({
				username: "newuser",
				name: "New Person",
				email: "new@example.com",
				password: "Passw0rd!"
			});
		});

		it("sends a single POST when Create is double or triple clicked", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openCreate(user);
			await fillCreate(user, dialog);

			await user.tripleClick(submitCreateButton(dialog));

			expect(pending("POST", USERS_URL)).toHaveLength(1);
			expect(submitCreateButton(dialog)).toBeDisabled();
			expect(submitCreateButton(dialog)).toHaveTextContent("Creating...");
		});

		it("ignores Escape, Cancel, the close button and the backdrop while creating", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openCreate(user);
			await fillCreate(user, dialog);
			await user.click(submitCreateButton(dialog));

			await user.keyboard("{Escape}");
			await user.click(
				within(dialog).getByRole("button", { name: "Cancel" })
			);
			await user.click(
				within(dialog).getByRole("button", {
					name: "Close Create user"
				})
			);

			expect(
				screen.getByRole("dialog", { name: "Create user" })
			).toBeInTheDocument();
			expect(
				within(dialog).getByRole("button", {
					name: "Close Create user"
				})
			).toHaveAttribute("aria-disabled", "true");
			expect(
				within(dialog).getByRole("button", { name: "Cancel" })
			).toBeDisabled();
		});

		it("closes on success, reloads the list and reopens empty", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openCreate(user);
			await fillCreate(user, dialog);
			await user.click(submitCreateButton(dialog));
			pending("POST", USERS_URL)[0]!.flush({
				data: { user: makeUser(3) }
			});

			await waitFor(() =>
				expect(
					screen.queryByRole("dialog", { name: "Create user" })
				).not.toBeInTheDocument()
			);
			flushUsers(listRequests()[0]!, [
				...USERS,
				makeUser(3, { username: "newuser" })
			]);
			expect(
				(await screen.findAllByText("newuser")).length
			).toBeGreaterThan(0);

			const reopened = await openCreate(user);
			expect(within(reopened).getByLabelText(/^Username/)).toHaveValue(
				""
			);
			expect(within(reopened).getByLabelText(/^Password/)).toHaveValue(
				""
			);
			expect(
				within(reopened).queryByRole("alert")
			).not.toBeInTheDocument();
		});

		it("reopening after Cancel does not carry old values or errors", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openCreate(user);
			await fillCreate(user, dialog, { username: "x", email: "bad" });
			await user.click(submitCreateButton(dialog));
			expect(within(dialog).getByRole("alert")).toBeInTheDocument();
			await user.click(
				within(dialog).getByRole("button", { name: "Cancel" })
			);
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);

			const reopened = await openCreate(user);
			expect(within(reopened).getByLabelText(/^Username/)).toHaveValue(
				""
			);
			expect(within(reopened).getByLabelText(/^Email/)).toHaveValue("");
			expect(
				within(reopened).queryByRole("alert")
			).not.toBeInTheDocument();
			expect(
				within(reopened).queryByText("Email is not valid.")
			).not.toBeInTheDocument();
		});

		it("opening and closing the dialog repeatedly with Escape leaves a single clean dialog", async () => {
			const user = userEvent.setup();
			await renderUsers();
			for (let i = 0; i < 4; i++) {
				await openCreate(user);
				await user.keyboard("{Escape}");
				await waitFor(() =>
					expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
				);
			}
			await openCreate(user);
			expect(screen.getAllByRole("dialog")).toHaveLength(1);
		});

		it("cancelled dialog does not post even if the user types first", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openCreate(user);
			await fillCreate(user, dialog);
			await user.keyboard("{Escape}");
			expect(pending("POST", USERS_URL)).toHaveLength(0);
		});

		it.each([
			[
				409,
				{ title: "Conflict", detail: "Username already taken" },
				"Username already taken"
			],
			[500, {}, "Failed to create user"],
			[0, null, "Failed to create user"],
			[404, { title: "Not Found" }, "Not Found"]
		])(
			"shows the failure for status %i and lets the admin retry",
			async (status, body, message) => {
				const user = userEvent.setup();
				await renderUsers();
				const dialog = await openCreate(user);
				await fillCreate(user, dialog);
				await user.click(submitCreateButton(dialog));
				fail(pending("POST", USERS_URL)[0]!, status, body);

				expect(
					await within(dialog).findByRole("alert")
				).toHaveTextContent(message);
				expect(submitCreateButton(dialog)).toBeEnabled();
				expect(within(dialog).getByLabelText(/^Username/)).toHaveValue(
					"newuser"
				);

				await user.click(submitCreateButton(dialog));
				expect(
					within(dialog).queryByRole("alert")
				).not.toBeInTheDocument();
				expect(pending("POST", USERS_URL)).toHaveLength(1);
			}
		);

		it("shows 422 validation issues under their fields and in the summary", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openCreate(user);
			await fillCreate(user, dialog);
			await user.click(submitCreateButton(dialog));
			pending("POST", USERS_URL)[0]!.flush(
				{
					type: "COMMON_SCHEMA_INVALID",
					issues: [
						{
							path: "email",
							code: "custom",
							message: "Email already registered."
						},
						{
							path: "username",
							code: "custom",
							message: "Username is reserved."
						}
					]
				},
				{ status: 422, statusText: "Unprocessable" }
			);

			const alert = await within(dialog).findByRole("alert");
			expect(alert).toHaveTextContent(
				"Email already registered. · Username is reserved."
			);
			expect(
				within(dialog).getByText("Email already registered.", {
					selector: "p"
				})
			).toBeInTheDocument();
			expect(
				within(dialog).getByText("Username is reserved.", {
					selector: "p"
				})
			).toBeInTheDocument();
		});

		it("changing the offending field after a server error and resubmitting clears the stale error", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openCreate(user);
			await fillCreate(user, dialog);
			await user.click(submitCreateButton(dialog));
			pending("POST", USERS_URL)[0]!.flush(
				{
					type: "COMMON_SCHEMA_INVALID",
					issues: [
						{
							path: "email",
							code: "custom",
							message: "Email already registered."
						}
					]
				},
				{ status: 422, statusText: "Unprocessable" }
			);
			await within(dialog).findByRole("alert");

			await user.clear(within(dialog).getByLabelText(/^Email/));
			await user.type(
				within(dialog).getByLabelText(/^Email/),
				"other@example.com"
			);
			await user.click(submitCreateButton(dialog));

			expect(
				within(dialog).queryByText("Email already registered.")
			).not.toBeInTheDocument();
			expect(pending("POST", USERS_URL)[0]!.request.body.email).toBe(
				"other@example.com"
			);
		});

		it.todo(
			"clears a server-side field error as soon as the admin edits that field, without waiting for the next submit"
		);

		it("toggles password visibility with an accessible, pressed button", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openCreate(user);
			const password = within(dialog).getByLabelText(/^Password/);
			expect(password).toHaveAttribute("type", "password");

			const show = within(dialog).getByRole("button", {
				name: "Show password"
			});
			expect(show).toHaveAttribute("aria-pressed", "false");
			await user.click(show);
			expect(password).toHaveAttribute("type", "text");
			const hide = within(dialog).getByRole("button", {
				name: "Hide password"
			});
			expect(hide).toHaveAttribute("aria-pressed", "true");
			await user.dblClick(hide);
			expect(password).toHaveAttribute("type", "text");
		});

		it("hides the password again when the dialog is reopened", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openCreate(user);
			await user.click(
				within(dialog).getByRole("button", { name: "Show password" })
			);
			await user.keyboard("{Escape}");
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);

			const reopened = await openCreate(user);
			expect(
				within(reopened).getByLabelText(/^Password/)
			).toHaveAttribute("type", "password");
			expect(
				within(reopened).getByRole("button", { name: "Show password" })
			).toHaveAttribute("aria-pressed", "false");
		});

		it("hides the new password again when the edit dialog is reopened", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openEdit(user);
			await user.click(
				within(dialog).getByRole("button", { name: "Show password" })
			);
			await user.keyboard("{Escape}");
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);

			const reopened = await openEdit(user);
			expect(
				within(reopened).getByLabelText("New Password")
			).toHaveAttribute("type", "password");
		});

		it("accepts unicode in the name and sends it untouched", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openCreate(user);
			await fillCreate(user, dialog, { name: "Ñandú Ünïcode 🎮" });
			await user.click(submitCreateButton(dialog));
			expect(pending("POST", USERS_URL)[0]!.request.body.name).toBe(
				"Ñandú Ünïcode 🎮"
			);
		});

		it("stops accepting characters at the maximum length of each field", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openCreate(user);
			const username = within(dialog).getByLabelText(/^Username/);
			await user.type(username, "a".repeat(30));
			expect(username).toHaveValue("a".repeat(15));
			const name = within(dialog).getByLabelText(/^Name/);
			await user.click(name);
			await user.paste("é".repeat(200));
			expect(name).toHaveValue("é".repeat(80));
			const password = within(dialog).getByLabelText(/^Password/);
			await user.type(password, "Aa1!".repeat(10));
			expect(password).toHaveValue("Aa1!".repeat(10).slice(0, 15));
		});

		it("keyboard: Tab walks the fields in order and Space on the eye toggles it", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openCreate(user);
			within(dialog)
				.getByLabelText(/^Username/)
				.focus();
			await user.tab();
			expect(within(dialog).getByLabelText(/^Name/)).toHaveFocus();
			await user.tab();
			expect(within(dialog).getByLabelText(/^Email/)).toHaveFocus();
			await user.tab();
			expect(within(dialog).getByLabelText(/^Password/)).toHaveFocus();
			await user.tab();
			const eye = within(dialog).getByRole("button", {
				name: "Show password"
			});
			expect(eye).toHaveFocus();
			await user.keyboard(" ");
			expect(within(dialog).getByLabelText(/^Password/)).toHaveAttribute(
				"type",
				"text"
			);
		});

		it("restores focus to the Create User button after closing", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const hero = screen.getByRole("button", { name: /Create User/ });
			await user.click(hero);
			await screen.findByRole("dialog", { name: "Create user" });
			await user.keyboard("{Escape}");
			await waitFor(() => expect(hero).toHaveFocus());
		});
	});

	describe("edit dialog", () => {
		it("opens prefilled for the clicked user, from the row and by keyboard", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openEdit(user, "bob");
			expect(within(dialog).getByLabelText("Name")).toHaveValue(
				"Bob Builder"
			);
			expect(within(dialog).getByLabelText("Role")).toHaveValue("user");
			expect(within(dialog).getByRole("checkbox")).not.toBeChecked();
			expect(within(dialog).getByText("Inactive")).toBeInTheDocument();
			await user.keyboard("{Escape}");
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);

			const button = screen.getAllByRole("button", {
				name: "Edit ada"
			})[0]!;
			button.focus();
			await user.keyboard("{Enter}");
			const second = await screen.findByRole("dialog", {
				name: "Edit user"
			});
			expect(within(second).getByLabelText("Name")).toHaveValue(
				"Ada Lovelace"
			);
		});

		it("clicking a table row opens the editor for that row's user", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const row = screen.getAllByRole("row")[2]!;
			await user.click(within(row).getByText("bob@example.com"));
			const dialog = await screen.findByRole("dialog", {
				name: "Edit user"
			});
			expect(within(dialog).getByLabelText("Name")).toHaveValue(
				"Bob Builder"
			);
		});

		it("saving without changes closes without calling the API", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openEdit(user);
			await user.click(submitEditButton(dialog));
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);
			expect(http.match(req => req.method === "PATCH")).toHaveLength(0);
		});

		it("sends only the changed fields and updates the row in place", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openEdit(user);
			await user.selectOptions(
				within(dialog).getByLabelText("Role"),
				"moderator"
			);
			await user.click(within(dialog).getByRole("checkbox"));
			await user.click(submitEditButton(dialog));

			const [patch] = pending("PATCH", `${USERS_URL}/u2`);
			expect(patch!.request.body).toEqual({
				role: "moderator",
				isActive: true
			});
			patch!.flush({
				data: { user: { ...BOB, role: "moderator", isActive: true } }
			});

			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);
			expect(screen.getAllByText("Mod").length).toBeGreaterThan(0);
			expect(screen.queryByText("Inactive")).not.toBeInTheDocument();
			expect(listRequests()).toHaveLength(0);
		});

		it("flipping a toggle twice sends nothing", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openEdit(user);
			const checkbox = within(dialog).getByRole("checkbox");
			await user.click(checkbox);
			await user.click(checkbox);
			await user.keyboard("{Escape}");
			expect(http.match(req => req.method === "PATCH")).toHaveLength(0);
		});

		it("sends a single PATCH when Save is double or triple clicked", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openEdit(user);
			await user.selectOptions(
				within(dialog).getByLabelText("Role"),
				"premium"
			);
			await user.tripleClick(submitEditButton(dialog));
			expect(pending("PATCH", `${USERS_URL}/u2`)).toHaveLength(1);
			expect(submitEditButton(dialog)).toBeDisabled();
			expect(submitEditButton(dialog)).toHaveTextContent("Saving...");
		});

		it("ignores Escape, Cancel and Close while saving", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openEdit(user);
			await user.selectOptions(
				within(dialog).getByLabelText("Role"),
				"premium"
			);
			await user.click(submitEditButton(dialog));
			await user.keyboard("{Escape}");
			await user.click(
				within(dialog).getByRole("button", { name: "Cancel" })
			);
			await user.click(
				within(dialog).getByRole("button", { name: "Close Edit user" })
			);
			expect(
				screen.getByRole("dialog", { name: "Edit user" })
			).toBeInTheDocument();
			pending("PATCH", `${USERS_URL}/u2`)[0]!.flush({
				data: { user: { ...BOB, role: "premium" } }
			});
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);
		});

		it("rejects an empty name, a short name and a name with angle brackets", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openEdit(user);
			const name = within(dialog).getByLabelText("Name");

			await user.clear(name);
			await user.click(submitEditButton(dialog));
			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				"Name is required."
			);

			await user.type(name, "abc");
			await user.click(submitEditButton(dialog));
			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				"Name must be between 4 and 80"
			);

			await user.clear(name);
			await user.type(name, "<script>");
			await user.click(submitEditButton(dialog));
			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				"Name must not contain < or >"
			);
			expect(http.match(req => req.method === "PATCH")).toHaveLength(0);
		});

		it("rejects a name made only of spaces instead of sending it to the server", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openEdit(user);
			const name = within(dialog).getByLabelText("Name");
			await user.clear(name);
			await user.type(name, "     ");
			await user.click(submitEditButton(dialog));

			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				"Name is required."
			);
			expect(http.match(req => req.method === "PATCH")).toHaveLength(0);
		});

		it("validates a new password only when something is typed", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openEdit(user);
			const password = within(dialog).getByLabelText("New Password");

			await user.type(password, "short");
			await user.click(submitEditButton(dialog));
			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				"Password must be between 8 and 15"
			);

			await user.clear(password);
			await user.type(password, "nouppercase1!");
			await user.click(submitEditButton(dialog));
			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				"at least one uppercase"
			);

			await user.clear(password);
			await user.type(password, "Valid1pass!");
			await user.click(submitEditButton(dialog));
			expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
			expect(
				pending("PATCH", `${USERS_URL}/u2`)[0]!.request.body
			).toEqual({
				password: "Valid1pass!"
			});
		});

		it("typing and then clearing the password keeps the current one", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openEdit(user);
			const password = within(dialog).getByLabelText("New Password");
			await user.type(password, "Valid1pass!");
			await user.clear(password);
			await user.click(submitEditButton(dialog));
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);
			expect(http.match(req => req.method === "PATCH")).toHaveLength(0);
		});

		it("a name that is changed back to the original is not sent and not validated", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openEdit(user);
			const name = within(dialog).getByLabelText("Name");
			await user.clear(name);
			await user.type(name, "Zed");
			await user.clear(name);
			await user.type(name, "Bob Builder");
			await user.click(submitEditButton(dialog));
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);
			expect(http.match(req => req.method === "PATCH")).toHaveLength(0);
		});

		it.each([
			[404, { title: "User not found" }, "User not found"],
			[409, { detail: "Conflict while saving" }, "Conflict while saving"],
			[500, {}, "Failed to update user"],
			[0, null, "Failed to update user"]
		])(
			"shows the failure for status %i and keeps the typed values",
			async (status, body, message) => {
				const user = userEvent.setup();
				await renderUsers();
				const dialog = await openEdit(user);
				await user.selectOptions(
					within(dialog).getByLabelText("Role"),
					"admin"
				);
				await user.click(submitEditButton(dialog));
				fail(pending("PATCH", `${USERS_URL}/u2`)[0]!, status, body);

				expect(
					await within(dialog).findByRole("alert")
				).toHaveTextContent(message);
				expect(within(dialog).getByLabelText("Role")).toHaveValue(
					"admin"
				);
				expect(submitEditButton(dialog)).toBeEnabled();
			}
		);

		it("shows 422 issues under the password and name and clears them on resubmit", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openEdit(user);
			await user.type(
				within(dialog).getByLabelText("New Password"),
				"Valid1pass!"
			);
			await user.click(submitEditButton(dialog));
			pending("PATCH", `${USERS_URL}/u2`)[0]!.flush(
				{
					type: "COMMON_SCHEMA_INVALID",
					issues: [
						{
							path: "password",
							code: "custom",
							message: "Password was breached."
						}
					]
				},
				{ status: 422, statusText: "Unprocessable" }
			);
			expect(await within(dialog).findByRole("alert")).toHaveTextContent(
				"Password was breached."
			);
			expect(
				within(dialog).getAllByText("Password was breached.").length
			).toBeGreaterThan(1);

			const password = within(dialog).getByLabelText("New Password");
			await user.clear(password);
			await user.type(password, "Other1pass!");
			await user.click(submitEditButton(dialog));
			expect(
				within(dialog).queryByText("Password was breached.")
			).not.toBeInTheDocument();
			expect(pending("PATCH", `${USERS_URL}/u2`)).toHaveLength(1);
		});

		it("reopening another user after Cancel shows that user's values and no old error", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openEdit(user, "bob");
			await user.clear(within(dialog).getByLabelText("Name"));
			await user.click(submitEditButton(dialog));
			expect(within(dialog).getByRole("alert")).toBeInTheDocument();
			await user.click(
				within(dialog).getByRole("button", { name: "Cancel" })
			);
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);

			const second = await openEdit(user, "ada");
			expect(within(second).getByLabelText("Name")).toHaveValue(
				"Ada Lovelace"
			);
			expect(within(second).getByLabelText("Role")).toHaveValue("admin");
			expect(within(second).getByLabelText("New Password")).toHaveValue(
				""
			);
			expect(within(second).queryByRole("alert")).not.toBeInTheDocument();
		});

		it("reopening the same user after a failed save starts from the stored data", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openEdit(user);
			await user.selectOptions(
				within(dialog).getByLabelText("Role"),
				"admin"
			);
			await user.click(submitEditButton(dialog));
			fail(pending("PATCH", `${USERS_URL}/u2`)[0]!, 500);
			await within(dialog).findByRole("alert");
			await user.keyboard("{Escape}");
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);

			const reopened = await openEdit(user);
			expect(within(reopened).getByLabelText("Role")).toHaveValue("user");
			expect(
				within(reopened).queryByRole("alert")
			).not.toBeInTheDocument();
		});

		it("password visibility toggle inside the edit dialog is named and pressed", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openEdit(user);
			await user.click(
				within(dialog).getByRole("button", { name: "Show password" })
			);
			expect(
				within(dialog).getByLabelText("New Password")
			).toHaveAttribute("type", "text");
			expect(
				within(dialog).getByRole("button", { name: "Hide password" })
			).toHaveAttribute("aria-pressed", "true");
		});

		it("the Active/Inactive label follows the checkbox and Space toggles it", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openEdit(user);
			const checkbox = within(dialog).getByRole("checkbox");
			checkbox.focus();
			await user.keyboard(" ");
			expect(checkbox).toBeChecked();
			expect(within(dialog).getByText("Active")).toBeInTheDocument();
		});

		it("edit buttons have names that identify the user", async () => {
			await renderUsers();
			expect(
				screen.getAllByRole("button", { name: "Edit ada" }).length
			).toBeGreaterThan(0);
			expect(
				screen.getAllByRole("button", { name: "Edit bob" }).length
			).toBeGreaterThan(0);
		});
	});

	describe("invitations panel", () => {
		it("lists pending and expired invitations and shows the empty copy", async () => {
			await renderUsers(USERS, INVITATIONS);
			expect(screen.getByText("pending@example.com")).toBeInTheDocument();
			expect(screen.getByText(/Expired/)).toBeInTheDocument();
		});

		it("shows the empty copy without invitations", async () => {
			await renderUsers();
			expect(
				screen.getByText(/No pending invitations/)
			).toBeInTheDocument();
		});

		it("validates the invite email and keeps the dialog open", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openInvite(user);
			await user.click(
				within(dialog).getByRole("button", { name: "Send invitation" })
			);
			expect(
				within(dialog).getByText("Email is required.")
			).toBeInTheDocument();

			const email = within(dialog).getByLabelText(/^Email/);
			await user.type(email, "no-at-sign");
			expect(
				within(dialog).getByText("Email is not valid.")
			).toBeInTheDocument();
			await user.click(
				within(dialog).getByRole("button", { name: "Send invitation" })
			);
			expect(pending("POST", INVITATIONS_URL)).toHaveLength(0);

			await user.clear(email);
			await user.type(email, "ok@example.com");
			expect(
				within(dialog).queryByText("Email is not valid.")
			).not.toBeInTheDocument();
		});

		it("rejects whitespace-only input as an invalid email", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openInvite(user);
			await user.type(within(dialog).getByLabelText(/^Email/), "   ");
			await user.click(
				within(dialog).getByRole("button", { name: "Send invitation" })
			);
			expect(pending("POST", INVITATIONS_URL)).toHaveLength(0);
		});

		it("sends once on double or triple click, toasts and reloads on success", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openInvite(user);
			await user.type(
				within(dialog).getByLabelText(/^Email/),
				"friend@example.com"
			);
			await user.tripleClick(
				within(dialog).getByRole("button", { name: "Send invitation" })
			);

			const posts = pending("POST", INVITATIONS_URL);
			expect(posts).toHaveLength(1);
			expect(posts[0]!.request.body).toEqual({
				email: "friend@example.com"
			});
			expect(
				within(dialog).getByRole("button", { name: "Sending..." })
			).toBeDisabled();
			posts[0]!.flush({ data: { invitation: INVITATIONS[0] } });

			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);
			expect(toast.success).toHaveBeenCalledWith(
				"Invitation sent to friend@example.com."
			);
			flushInvitations(invitationListRequests()[0]!, INVITATIONS);
			expect(
				await screen.findByText("pending@example.com")
			).toBeInTheDocument();
		});

		it("cannot be dismissed while the invitation is being sent", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openInvite(user);
			await user.type(
				within(dialog).getByLabelText(/^Email/),
				"friend@example.com"
			);
			await user.click(
				within(dialog).getByRole("button", { name: "Send invitation" })
			);
			await user.keyboard("{Escape}");
			await user.click(
				within(dialog).getByRole("button", { name: "Cancel" })
			);
			expect(
				screen.getByRole("dialog", { name: "Invite by email" })
			).toBeInTheDocument();
		});

		it.each([
			[409, "This email already has an account."],
			[503, "Email delivery is not configured on the server."],
			[502, "The email could not be sent. Try again in a moment."],
			[500, "Could not send the invitation."],
			[0, "Could not send the invitation."]
		])(
			"explains a %i failure and allows retrying",
			async (status, message) => {
				const user = userEvent.setup();
				await renderUsers();
				const dialog = await openInvite(user);
				await user.type(
					within(dialog).getByLabelText(/^Email/),
					"friend@example.com"
				);
				await user.click(
					within(dialog).getByRole("button", {
						name: "Send invitation"
					})
				);
				fail(pending("POST", INVITATIONS_URL)[0]!, status);

				expect(
					await within(dialog).findByRole("alert")
				).toHaveTextContent(message);
				expect(within(dialog).getByLabelText(/^Email/)).toHaveValue(
					"friend@example.com"
				);

				await user.click(
					within(dialog).getByRole("button", {
						name: "Send invitation"
					})
				);
				expect(
					within(dialog).queryByRole("alert")
				).not.toBeInTheDocument();
				expect(pending("POST", INVITATIONS_URL)).toHaveLength(1);
			}
		);

		it("uses the server title for unknown failures", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openInvite(user);
			await user.type(
				within(dialog).getByLabelText(/^Email/),
				"friend@example.com"
			);
			await user.click(
				within(dialog).getByRole("button", { name: "Send invitation" })
			);
			fail(pending("POST", INVITATIONS_URL)[0]!, 429, {
				title: "Too many invitations"
			});
			expect(await within(dialog).findByRole("alert")).toHaveTextContent(
				"Too many invitations"
			);
		});

		it("reopening after Cancel or a failure shows an empty email and no error", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openInvite(user);
			await user.type(
				within(dialog).getByLabelText(/^Email/),
				"friend@example.com"
			);
			await user.click(
				within(dialog).getByRole("button", { name: "Send invitation" })
			);
			fail(pending("POST", INVITATIONS_URL)[0]!, 503);
			await within(dialog).findByRole("alert");
			await user.keyboard("{Escape}");
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);

			const reopened = await openInvite(user);
			expect(within(reopened).getByLabelText(/^Email/)).toHaveValue("");
			expect(
				within(reopened).queryByRole("alert")
			).not.toBeInTheDocument();
			expect(
				within(reopened).queryByText("Email is required.")
			).not.toBeInTheDocument();
		});

		it("Enter in the email field submits once", async () => {
			const user = userEvent.setup();
			await renderUsers();
			const dialog = await openInvite(user);
			await user.type(
				within(dialog).getByLabelText(/^Email/),
				"friend@example.com{Enter}{Enter}"
			);
			expect(pending("POST", INVITATIONS_URL)).toHaveLength(1);
		});

		it("resend posts the email again, disables the busy row and toasts", async () => {
			const user = userEvent.setup();
			await renderUsers(USERS, INVITATIONS);
			const resendButtons = screen.getAllByRole("button", {
				name: /Resend/
			});
			await user.tripleClick(resendButtons[0]!);

			const posts = pending("POST", INVITATIONS_URL);
			expect(posts).toHaveLength(1);
			expect(posts[0]!.request.body).toEqual({
				email: "pending@example.com"
			});
			const rows = screen.getAllByRole("listitem");
			expect(
				within(rows[0]!).getByRole("button", { name: "Sending..." })
			).toBeDisabled();
			expect(
				within(rows[0]!).getByRole("button", { name: "Revoke" })
			).toBeDisabled();
			posts[0]!.flush({ data: { invitation: INVITATIONS[0] } });
			await waitFor(() =>
				expect(toast.success).toHaveBeenCalledWith(
					"Invitation resent to pending@example.com."
				)
			);
			flushInvitations(invitationListRequests()[0]!, INVITATIONS);
		});

		it("warns when a resend fails with 502 and re-enables the buttons", async () => {
			const user = userEvent.setup();
			await renderUsers(USERS, INVITATIONS);
			await user.click(
				screen.getAllByRole("button", { name: /Resend/ })[0]!
			);
			fail(pending("POST", INVITATIONS_URL)[0]!, 502);
			await waitFor(() =>
				expect(toast.warning).toHaveBeenCalledWith(
					"The email could not be sent. Try again in a moment."
				)
			);
			expect(
				screen.getAllByRole("button", { name: "Resend" })[0]
			).toBeEnabled();
		});

		it("gives no feedback when a resend hits a 409", async () => {
			const user = userEvent.setup();
			await renderUsers(USERS, INVITATIONS);
			await user.click(
				screen.getAllByRole("button", { name: /Resend/ })[0]!
			);
			fail(pending("POST", INVITATIONS_URL)[0]!, 409);
			await waitFor(() =>
				expect(
					screen.getAllByRole("button", { name: "Resend" })[0]
				).toBeEnabled()
			);
			expect(toast.warning).not.toHaveBeenCalled();
			expect(toast.success).not.toHaveBeenCalled();
		});

		it("revoke asks for confirmation, Cancel backs out and nothing is sent", async () => {
			const user = userEvent.setup();
			await renderUsers(USERS, INVITATIONS);
			await user.click(
				screen.getAllByRole("button", { name: /Revoke/ })[0]!
			);
			expect(
				screen.getByText("Revoke this invitation?")
			).toBeInTheDocument();
			await user.click(screen.getByRole("button", { name: "Cancel" }));
			expect(
				screen.queryByText("Revoke this invitation?")
			).not.toBeInTheDocument();
			expect(http.match(req => req.method === "DELETE")).toHaveLength(0);
		});

		it("confirming revoke twice or three times sends one DELETE and removes only that row", async () => {
			const user = userEvent.setup();
			await renderUsers(USERS, INVITATIONS);
			await user.click(
				screen.getAllByRole("button", { name: /Revoke/ })[0]!
			);
			await user.tripleClick(
				within(screen.getAllByRole("listitem")[0]!).getByRole(
					"button",
					{
						name: "Revoke"
					}
				)
			);

			const deletes = pending("DELETE", `${INVITATIONS_URL}/i1`);
			expect(deletes).toHaveLength(1);
			deletes[0]!.flush(null);

			await waitFor(() =>
				expect(
					screen.queryByText("pending@example.com")
				).not.toBeInTheDocument()
			);
			expect(screen.getByText("expired@example.com")).toBeInTheDocument();
			expect(toast.success).toHaveBeenCalledWith(
				"Invitation for pending@example.com revoked."
			);
		});

		it.each([404, 500, 0])(
			"warns when revoke fails with %i and keeps the confirmation open",
			async status => {
				const user = userEvent.setup();
				await renderUsers(USERS, INVITATIONS);
				await user.click(
					screen.getAllByRole("button", { name: /Revoke/ })[0]!
				);
				await user.click(
					within(screen.getAllByRole("listitem")[0]!).getByRole(
						"button",
						{
							name: "Revoke"
						}
					)
				);
				fail(pending("DELETE", `${INVITATIONS_URL}/i1`)[0]!, status);

				await waitFor(() =>
					expect(toast.warning).toHaveBeenCalledWith(
						"Could not revoke the invitation."
					)
				);
				expect(
					screen.getByText("pending@example.com")
				).toBeInTheDocument();
				expect(
					screen.getByText("Revoke this invitation?")
				).toBeInTheDocument();
				expect(
					within(screen.getAllByRole("listitem")[0]!).getByRole(
						"button",
						{
							name: "Revoke"
						}
					)
				).toBeEnabled();
			}
		);

		it("clicking the other row's Resend while one is busy does nothing and gives no feedback", async () => {
			const user = userEvent.setup();
			await renderUsers(USERS, INVITATIONS);
			const rows = screen.getAllByRole("listitem");
			await user.click(
				within(rows[0]!).getByRole("button", { name: /Resend/ })
			);
			const other = within(rows[1]!).getByRole("button", {
				name: /Resend/
			});
			expect(other).toBeEnabled();
			await user.click(other);
			expect(pending("POST", INVITATIONS_URL)).toHaveLength(1);
		});

		it("tells the admin when the invitation list cannot be loaded and lets them retry", async () => {
			const user = userEvent.setup();
			await render(AdminUsers, {
				providers: [
					provideHttpClient(),
					provideHttpClientTesting(),
					{ provide: ToastService, useValue: toast }
				]
			});
			http = TestBed.inject(HttpTestingController);
			fail(invitationListRequests()[0]!, 500);
			flushUsers(listRequests()[0]!);

			expect(
				await screen.findByText("Could not load the invitations.")
			).toBeInTheDocument();
			expect(
				screen.queryByText(/No pending invitations/)
			).not.toBeInTheDocument();

			const alert = screen.getByText("Could not load the invitations.");
			await user.click(
				within(alert.parentElement!).getByRole("button", {
					name: "Try again"
				})
			);
			flushInvitations(invitationListRequests()[0]!, INVITATIONS);
			expect(
				await screen.findByText("pending@example.com")
			).toBeInTheDocument();
			expect(
				screen.queryByText("Could not load the invitations.")
			).not.toBeInTheDocument();
		});
	});
});
