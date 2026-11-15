import {
	HttpErrorResponse,
	type HttpHandlerFn,
	type HttpRequest
} from "@angular/common/http";
import { inject } from "@angular/core";
import {
	AsyncSubject,
	catchError,
	from,
	map,
	type Observable,
	of,
	switchMap,
	take,
	throwError
} from "rxjs";

import {
	SUPPRESS_CONFLICT_TOAST,
	SUPPRESS_VALIDATION_TOAST,
	validationSummary
} from "../../shared/utils/validation-errors";
import { AuthService } from "../services/auth";
import { ToastService } from "../services/toast";
import { adminErrorMessage } from "../utils/admin-error-message";
import { planLimitMessage } from "../utils/plan-limit-message";
import { problemType } from "../utils/problem-details";

const PLAN_LIMIT_TOAST_TITLE = "Free plan limit";
const REFRESH_LEFT_NO_TOKEN = Symbol("refresh-left-no-token");
let pendingRefresh: Observable<string> | null = null;

export function errorInterceptor(
	req: HttpRequest<unknown>,
	next: HttpHandlerFn
) {
	const auth = inject(AuthService);
	const toast = inject(ToastService);

	return next(req).pipe(
		catchError(rawError =>
			withParsedBlobBody(rawError).pipe(
				switchMap(error => {
					if (error.status === 409) {
						if (req.context.get(SUPPRESS_CONFLICT_TOAST))
							return throwError(() => error);
						const detail =
							adminErrorMessage(error) ??
							error.error?.detail ??
							error.error?.title ??
							"This action was already performed. Please refresh and try again.";
						toast.warning(detail);
						return throwError(() => error);
					}

					if (error.status === 402) {
						const message = planLimitMessage(problemType(error));
						if (message)
							toast.premium(
								PLAN_LIMIT_TOAST_TITLE,
								message,
								6000
							);
						return throwError(() => error);
					}

					if (error.status === 429) {
						toast.warning(
							"Too many requests. Please wait a moment and try again."
						);
						return throwError(() => error);
					}

					if (error.status === 422) {
						const suppress = req.context.get(
							SUPPRESS_VALIDATION_TOAST
						);
						if (!suppress) {
							const summary = validationSummary(error);
							if (summary) toast.warning(summary);
						}
						return throwError(() => error);
					}

					if (error.status !== 401 || isAuthRequest(req.url)) {
						return throwError(() => error);
					}

					const startsRefresh = pendingRefresh === null;
					return sharedRefresh(auth).pipe(
						catchError(refreshError =>
							throwError(() =>
								startsRefresh &&
								refreshError !== REFRESH_LEFT_NO_TOKEN
									? refreshError
									: error
							)
						),
						switchMap(token =>
							next(
								req.clone({
									headers: req.headers.set(
										"Authorization",
										`Bearer ${token}`
									)
								})
							)
						)
					);
				})
			)
		)
	);
}

function sharedRefresh(auth: AuthService): Observable<string> {
	if (pendingRefresh) return pendingRefresh;
	const refreshOutcome = new AsyncSubject<string>();
	const sharedOutcome = refreshOutcome.asObservable();
	pendingRefresh = sharedOutcome;
	const failedToken = auth.token();

	auth.refresh()
		.pipe(
			map(() => auth.token()),
			catchError(refreshError => {
				const rotatedToken = auth.token();
				if (
					isRejectedRefresh(refreshError) &&
					rotatedToken &&
					rotatedToken !== failedToken
				)
					return of(rotatedToken);
				if (!keepsSessionOnRefreshFailure(refreshError))
					auth.clearSession();
				return throwError(() => refreshError);
			}),
			switchMap(token => {
				if (token) return of(token);
				auth.clearSession();
				return throwError(() => REFRESH_LEFT_NO_TOKEN);
			}),
			take(1)
		)
		.subscribe({
			next: token => {
				pendingRefresh = null;
				refreshOutcome.next(token);
				refreshOutcome.complete();
			},
			error: refreshError => {
				pendingRefresh = null;
				refreshOutcome.error(refreshError);
			},
			complete: () => {
				if (pendingRefresh !== sharedOutcome) return;
				pendingRefresh = null;
				refreshOutcome.error(REFRESH_LEFT_NO_TOKEN);
			}
		});

	return sharedOutcome;
}

function withParsedBlobBody(
	error: HttpErrorResponse
): Observable<HttpErrorResponse> {
	if (!(error instanceof HttpErrorResponse) || !(error.error instanceof Blob))
		return of(error);
	return from(error.error.text()).pipe(
		map(
			text =>
				new HttpErrorResponse({
					error: parseJsonOrText(text),
					headers: error.headers,
					status: error.status,
					statusText: error.statusText,
					url: error.url ?? undefined
				})
		),
		catchError(() => of(error))
	);
}

function parseJsonOrText(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

function isRejectedRefresh(error: unknown): boolean {
	return (
		error instanceof HttpErrorResponse &&
		(error.status === 401 || error.status === 403)
	);
}

function keepsSessionOnRefreshFailure(error: unknown): boolean {
	return (
		error instanceof HttpErrorResponse &&
		(error.status === 0 || error.status === 429 || error.status >= 500)
	);
}

function isAuthRequest(url: string): boolean {
	return url.includes("/auth/refresh") || url.includes("/auth/login");
}
