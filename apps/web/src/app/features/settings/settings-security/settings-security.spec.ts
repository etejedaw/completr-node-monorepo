import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of, Subject, throwError } from "rxjs";

import { environment } from "../../../../environments/environment";
import { AuthService, type AuthSession } from "../../../core/services/auth";
import { ToastService } from "../../../core/services/toast";
import { SettingsSecurity } from "./settings-security";

const api = environment.apiUrl;
const VALID_PASSWORD = "Abcdef1!";

function buildSession(id: string, deviceInfo: string | null): AuthSession {
	return {
		id,
		deviceInfo,
		lastUsedAt: new Date().toISOString(),
		createdAt: new Date().toISOString(),
		expiresAt: "2099-01-01T00:00:00.000Z"
	};
}

const CHROME_WINDOWS =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36";
const SAFARI_IPHONE =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";
const FIREFOX_LINUX =
	"Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0";

describe("SettingsSecurity", () => {
	const getSessions = vi.fn();
	const revokeSession = vi.fn();
	const revokeOtherSessions = vi.fn();
	const sessionId = vi.fn();
	const toast = { success: vi.fn(), warning: vi.fn() };

	const currentSession = buildSession("s-current", SAFARI_IPHONE);
	const windowsSession = buildSession("s-win", CHROME_WINDOWS);
	const linuxSession = buildSession("s-linux", FIREFOX_LINUX);

	async function renderSecurity() {
		const result = await render(SettingsSecurity, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{
					provide: AuthService,
					useValue: {
						sessionId,
						getSessions,
						revokeSession,
						revokeOtherSessions
					}
				},
				{ provide: ToastService, useValue: toast }
			]
		});
		return result;
	}

	function sessionRow(deviceName: string) {
		return screen.getByText(deviceName).closest("li") as HTMLElement;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		sessionId.mockReturnValue("s-current");
		getSessions.mockReturnValue(
			of({
				sessions: [windowsSession, currentSession, linuxSession],
				total: 3
			})
		);
	});

	afterEach(() => {
		TestBed.inject(HttpTestingController).verify();
	});

	describe("password", () => {
		async function fillPasswords(
			typist: ReturnType<typeof userEvent.setup>,
			newPassword: string,
			confirmPassword: string
		) {
			await typist.type(
				screen.getByLabelText("New password"),
				newPassword
			);
			await typist.type(
				screen.getByLabelText("Confirm password"),
				confirmPassword
			);
		}

		it("hides the passwords by default and toggles their visibility", async () => {
			const typist = userEvent.setup();
			await renderSecurity();

			expect(screen.getByLabelText("New password")).toHaveAttribute(
				"type",
				"password"
			);

			await typist.click(
				screen.getByRole("button", { name: "Show passwords" })
			);

			expect(screen.getByLabelText("New password")).toHaveAttribute(
				"type",
				"text"
			);
			expect(screen.getByLabelText("Confirm password")).toHaveAttribute(
				"type",
				"text"
			);
			expect(
				screen.getByRole("button", { name: "Hide passwords" })
			).toHaveAttribute("aria-pressed", "true");
		});

		it("ticks each requirement as the password satisfies it", async () => {
			const typist = userEvent.setup();
			await renderSecurity();

			const rules = screen.getByRole("list", {
				name: "Password requirements"
			});
			expect(within(rules).getAllByText("(missing)")).toHaveLength(5);

			await typist.type(screen.getByLabelText("New password"), "abc");

			expect(within(rules).getAllByText("(done)")).toHaveLength(1);

			await typist.clear(screen.getByLabelText("New password"));
			await typist.type(
				screen.getByLabelText("New password"),
				VALID_PASSWORD
			);

			expect(within(rules).getAllByText("(done)")).toHaveLength(5);
		});

		it("shows the policy error after leaving a weak password and does not call the API", async () => {
			const typist = userEvent.setup();
			await renderSecurity();

			await fillPasswords(typist, "weak", "weak");
			await typist.click(
				screen.getByRole("button", { name: "Update password" })
			);

			expect(
				screen.getByText("Meet every requirement below.")
			).toBeInTheDocument();
			expect(toast.success).not.toHaveBeenCalled();
		});

		it("shows a mismatch error when the confirmation differs", async () => {
			const typist = userEvent.setup();
			await renderSecurity();

			await fillPasswords(typist, VALID_PASSWORD, "Abcdef1?");
			await typist.click(
				screen.getByRole("button", { name: "Update password" })
			);

			expect(
				screen.getByText("Both passwords must match.")
			).toBeInTheDocument();
		});

		it("blocks submitting an empty form", async () => {
			const typist = userEvent.setup();
			await renderSecurity();

			await typist.click(
				screen.getByRole("button", { name: "Update password" })
			);

			expect(
				screen.getByText("Meet every requirement below.")
			).toBeInTheDocument();
		});

		it("limits the password inputs to 15 characters", async () => {
			await renderSecurity();

			expect(screen.getByLabelText("New password")).toHaveAttribute(
				"maxlength",
				"15"
			);
			expect(screen.getByLabelText("Confirm password")).toHaveAttribute(
				"maxlength",
				"15"
			);
		});

		it("patches the password, resets the form and reloads the sessions", async () => {
			const typist = userEvent.setup();
			await renderSecurity();
			await typist.click(
				screen.getByRole("button", { name: "Show passwords" })
			);
			await fillPasswords(typist, VALID_PASSWORD, VALID_PASSWORD);
			getSessions.mockClear();

			await typist.click(
				screen.getByRole("button", { name: "Update password" })
			);

			const httpTesting = TestBed.inject(HttpTestingController);
			const req = httpTesting.expectOne(`${api}/auth/password`);
			expect(req.request.method).toBe("PATCH");
			expect(req.request.body).toEqual({ password: VALID_PASSWORD });
			expect(
				await screen.findByRole("button", { name: "Updating…" })
			).toBeDisabled();

			req.flush({});

			expect(
				await screen.findByRole("button", { name: "Update password" })
			).toBeEnabled();
			expect(toast.success).toHaveBeenCalledWith(
				"Password updated. Your other devices were signed out."
			);
			expect(screen.getByLabelText("New password")).toHaveValue("");
			expect(screen.getByLabelText("Confirm password")).toHaveValue("");
			expect(screen.getByLabelText("New password")).toHaveAttribute(
				"type",
				"password"
			);
			expect(
				screen.getByRole("button", { name: "Update password" })
			).toBeEnabled();
			expect(
				screen.queryByText("Both passwords must match.")
			).not.toBeInTheDocument();
			expect(getSessions).toHaveBeenCalledWith({ limit: 10, offset: 0 });
		});

		it("warns and keeps the typed passwords when the API fails", async () => {
			const typist = userEvent.setup();
			await renderSecurity();
			await fillPasswords(typist, VALID_PASSWORD, VALID_PASSWORD);

			await typist.click(
				screen.getByRole("button", { name: "Update password" })
			);
			TestBed.inject(HttpTestingController)
				.expectOne(`${api}/auth/password`)
				.flush(null, { status: 400, statusText: "Bad Request" });

			expect(
				await screen.findByRole("button", { name: "Update password" })
			).toBeEnabled();
			expect(toast.warning).toHaveBeenCalledWith(
				"Could not update your password."
			);
			expect(toast.success).not.toHaveBeenCalled();
			expect(screen.getByLabelText("New password")).toHaveValue(
				VALID_PASSWORD
			);
			expect(
				screen.getByRole("button", { name: "Update password" })
			).toBeEnabled();
		});
	});

	describe("sessions", () => {
		it("requests the first page of sessions on load", async () => {
			await renderSecurity();

			expect(getSessions).toHaveBeenCalledWith({ limit: 10, offset: 0 });
		});

		it("shows a skeleton while the sessions load", async () => {
			getSessions.mockReturnValue(new Subject());
			await renderSecurity();

			expect(screen.getByLabelText("Loading devices")).toHaveAttribute(
				"aria-busy",
				"true"
			);
		});

		it("shows an empty message when there are no sessions", async () => {
			getSessions.mockReturnValue(of({ sessions: [], total: 0 }));
			await renderSecurity();

			expect(screen.getByText("No active sessions.")).toBeInTheDocument();
		});

		it("falls back to the empty message when loading fails", async () => {
			getSessions.mockReturnValue(throwError(() => ({ status: 500 })));
			await renderSecurity();

			expect(screen.getByText("No active sessions.")).toBeInTheDocument();
			expect(
				screen.queryByLabelText("Loading devices")
			).not.toBeInTheDocument();
		});

		it("lists the current device first with its badge and no sign out button", async () => {
			await renderSecurity();

			const items = screen.getAllByRole("listitem");
			const devices = items.filter(item =>
				item.textContent?.includes("Active")
			);
			expect(devices).toHaveLength(3);
			expect(devices[0]).toHaveTextContent("Safari · iPhone");
			expect(devices[0]).toHaveTextContent("This device");
			expect(
				within(devices[0]!).queryByRole("button")
			).not.toBeInTheDocument();
			expect(screen.getAllByText("This device").length).toBe(1);
		});

		it("offers a sign out button for every other device", async () => {
			await renderSecurity();

			expect(
				screen.getByRole("button", {
					name: "Sign out Chrome · Windows"
				})
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Sign out Firefox · Linux" })
			).toBeInTheDocument();
		});

		it("signs out one device, confirms and reloads the list", async () => {
			const typist = userEvent.setup();
			await renderSecurity();
			revokeSession.mockReturnValue(of(""));
			getSessions.mockClear();
			getSessions.mockReturnValue(
				of({ sessions: [currentSession, linuxSession], total: 2 })
			);

			await typist.click(
				screen.getByRole("button", {
					name: "Sign out Chrome · Windows"
				})
			);

			expect(revokeSession).toHaveBeenCalledWith("s-win");
			expect(toast.success).toHaveBeenCalledWith(
				"Signed out Chrome · Windows."
			);
			expect(getSessions).toHaveBeenCalledTimes(1);
			expect(
				screen.queryByText("Chrome · Windows")
			).not.toBeInTheDocument();
		});

		it("shows progress on the device being signed out and ignores other clicks", async () => {
			const typist = userEvent.setup();
			await renderSecurity();
			revokeSession.mockReturnValue(new Subject());

			await typist.click(
				screen.getByRole("button", {
					name: "Sign out Chrome · Windows"
				})
			);

			expect(
				within(sessionRow("Chrome · Windows")).getByRole("button")
			).toBeDisabled();
			expect(
				within(sessionRow("Chrome · Windows")).getByRole("button")
			).toHaveTextContent("Signing out…");

			await typist.click(
				screen.getByRole("button", { name: "Sign out Firefox · Linux" })
			);

			expect(revokeSession).toHaveBeenCalledTimes(1);
		});

		it("warns when a device cannot be signed out", async () => {
			const typist = userEvent.setup();
			await renderSecurity();
			revokeSession.mockReturnValue(throwError(() => ({ status: 500 })));

			await typist.click(
				screen.getByRole("button", {
					name: "Sign out Chrome · Windows"
				})
			);

			expect(toast.warning).toHaveBeenCalledWith(
				"Could not sign out that device."
			);
			expect(screen.getByText("Chrome · Windows")).toBeInTheDocument();
			expect(
				screen.getByRole("button", {
					name: "Sign out Chrome · Windows"
				})
			).toBeEnabled();
		});
	});

	describe("sign out other devices", () => {
		it("is hidden when this is the only session", async () => {
			getSessions.mockReturnValue(
				of({ sessions: [currentSession], total: 1 })
			);
			await renderSecurity();

			expect(
				screen.queryByRole("button", { name: /Sign out other devices/ })
			).not.toBeInTheDocument();
		});

		it("asks for confirmation with the number of other devices", async () => {
			const typist = userEvent.setup();
			await renderSecurity();

			await typist.click(
				screen.getByRole("button", { name: /Sign out other devices/ })
			);

			const dialog = screen.getByRole("alertdialog");
			expect(dialog).toHaveTextContent("Sign out 2 other devices?");
			expect(
				screen.queryByRole("button", { name: /Sign out other devices/ })
			).not.toBeInTheDocument();
		});

		it("uses the singular when only one other device is signed in", async () => {
			const typist = userEvent.setup();
			getSessions.mockReturnValue(
				of({ sessions: [currentSession, linuxSession], total: 2 })
			);
			await renderSecurity();

			await typist.click(
				screen.getByRole("button", { name: /Sign out other devices/ })
			);

			expect(screen.getByRole("alertdialog")).toHaveTextContent(
				"Sign out 1 other device?"
			);
		});

		it("cancels without calling the API", async () => {
			const typist = userEvent.setup();
			await renderSecurity();

			await typist.click(
				screen.getByRole("button", { name: /Sign out other devices/ })
			);
			await typist.click(screen.getByRole("button", { name: "Cancel" }));

			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
			expect(revokeOtherSessions).not.toHaveBeenCalled();
			expect(
				screen.getByRole("button", { name: /Sign out other devices/ })
			).toBeInTheDocument();
		});

		it("revokes the other sessions of the current one and reports how many", async () => {
			const typist = userEvent.setup();
			await renderSecurity();
			revokeOtherSessions.mockReturnValue(of(2));
			getSessions.mockClear();
			getSessions.mockReturnValue(
				of({ sessions: [currentSession], total: 1 })
			);

			await typist.click(
				screen.getByRole("button", { name: /Sign out other devices/ })
			);
			await typist.click(
				screen.getByRole("button", { name: "Sign them out" })
			);

			expect(revokeOtherSessions).toHaveBeenCalledWith("s-current");
			expect(toast.success).toHaveBeenCalledWith(
				"Signed out 2 other devices."
			);
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
			expect(getSessions).toHaveBeenCalledWith({ limit: 10, offset: 0 });
			expect(
				screen.queryByText("Chrome · Windows")
			).not.toBeInTheDocument();
		});

		it("uses the singular in the toast for a single device", async () => {
			const typist = userEvent.setup();
			await renderSecurity();
			revokeOtherSessions.mockReturnValue(of(1));

			await typist.click(
				screen.getByRole("button", { name: /Sign out other devices/ })
			);
			await typist.click(
				screen.getByRole("button", { name: "Sign them out" })
			);

			expect(toast.success).toHaveBeenCalledWith(
				"Signed out 1 other device."
			);
		});

		it("says so when no other device was signed in", async () => {
			const typist = userEvent.setup();
			await renderSecurity();
			revokeOtherSessions.mockReturnValue(of(0));

			await typist.click(
				screen.getByRole("button", { name: /Sign out other devices/ })
			);
			await typist.click(
				screen.getByRole("button", { name: "Sign them out" })
			);

			expect(toast.success).toHaveBeenCalledWith(
				"No other devices were signed in."
			);
		});

		it("disables both buttons while signing out", async () => {
			const typist = userEvent.setup();
			await renderSecurity();
			revokeOtherSessions.mockReturnValue(new Subject());

			await typist.click(
				screen.getByRole("button", { name: /Sign out other devices/ })
			);
			await typist.click(
				screen.getByRole("button", { name: "Sign them out" })
			);

			expect(
				screen.getByRole("button", { name: "Signing out…" })
			).toBeDisabled();
			expect(
				screen.getByRole("button", { name: "Cancel" })
			).toBeDisabled();
		});

		it("keeps the confirmation open and warns when the API fails", async () => {
			const typist = userEvent.setup();
			await renderSecurity();
			revokeOtherSessions.mockReturnValue(
				throwError(() => ({ status: 500 }))
			);

			await typist.click(
				screen.getByRole("button", { name: /Sign out other devices/ })
			);
			await typist.click(
				screen.getByRole("button", { name: "Sign them out" })
			);

			expect(toast.warning).toHaveBeenCalledWith(
				"Could not sign out your other devices."
			);
			expect(screen.getByRole("alertdialog")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Sign them out" })
			).toBeEnabled();
		});

		it("asks to sign in again when the current session is unknown", async () => {
			const typist = userEvent.setup();
			sessionId.mockReturnValue(null);
			await renderSecurity();

			await typist.click(
				screen.getByRole("button", { name: /Sign out other devices/ })
			);
			await typist.click(
				screen.getByRole("button", { name: "Sign them out" })
			);

			expect(toast.warning).toHaveBeenCalledWith(
				"Sign in again to manage your devices."
			);
			expect(revokeOtherSessions).not.toHaveBeenCalled();
		});
	});

	describe("pagination", () => {
		function manySessions(count: number) {
			return Array.from({ length: count }, (_, i) =>
				buildSession(`s-${i}`, FIREFOX_LINUX)
			);
		}

		it("hides the pagination for ten sessions or fewer", async () => {
			getSessions.mockReturnValue(
				of({ sessions: manySessions(10), total: 10 })
			);
			await renderSecurity();

			expect(
				screen.queryByRole("navigation", { name: /pagination/i })
			).not.toBeInTheDocument();
		});

		it("requests the next page by offset", async () => {
			const typist = userEvent.setup();
			getSessions.mockReturnValue(
				of({ sessions: manySessions(10), total: 25 })
			);
			await renderSecurity();
			getSessions.mockClear();

			await typist.click(screen.getByRole("button", { name: /next/i }));

			expect(getSessions).toHaveBeenCalledWith({ limit: 10, offset: 10 });
		});
	});
});
