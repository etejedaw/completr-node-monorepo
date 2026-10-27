import {
	HttpErrorResponse,
	type HttpHandlerFn,
	type HttpRequest
} from "@angular/common/http";
import { inject } from "@angular/core";
import {
	BehaviorSubject,
	catchError,
	filter,
	finalize,
	from,
	map,
	type Observable,
	of,
	switchMap,
	take,
	throwError
} from "rxjs";

import {
	SUPPRESS_VALIDATION_TOAST,
	validationSummary
} from "../../shared/utils/validation-errors";
import { AuthService } from "../services/auth";
import { ToastService } from "../services/toast";
import { adminErrorMessage } from "../utils/admin-error-message";
import { planLimitMessage } from "../utils/plan-limit-message";

let isRefreshing = false;
const PLAN_LIMIT_TOAST_TITLE = "Free plan limit";
const REFRESH_FAILED = Symbol("refresh-failed");
const refreshSubject = new BehaviorSubject<
	string | typeof REFRESH_FAILED | null
>(null);

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
						const detail =
							adminErrorMessage(error) ??
							error.error?.detail ??
							error.error?.title ??
							"This action was already performed. Please refresh and try again.";
						toast.warning(detail);
						return throwError(() => error);
					}

					if (error.status === 402) {
						const message = planLimitMessage(error.error?.type);
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

					if (isRefreshing) {
						return refreshSubject.pipe(
							filter(token => token !== null),
							take(1),
							switchMap(token => {
								if (token === REFRESH_FAILED)
									return throwError(() => error);
								const retryReq = req.clone({
									headers: req.headers.set(
										"Authorization",
										`Bearer ${token}`
									)
								});
								return next(retryReq);
							})
						);
					}

					isRefreshing = true;
					refreshSubject.next(null);

					return auth.refresh().pipe(
						switchMap(() => {
							const newToken = auth.token();
							refreshSubject.next(newToken);
							const retryReq = req.clone({
								headers: req.headers.set(
									"Authorization",
									`Bearer ${newToken}`
								)
							});
							return next(retryReq);
						}),
						catchError(refreshError => {
							refreshSubject.next(REFRESH_FAILED);
							auth.clearSession();
							return throwError(() => refreshError);
						}),
						finalize(() => {
							isRefreshing = false;
						})
					);
				})
			)
		)
	);
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

function isAuthRequest(url: string): boolean {
	return url.includes("/auth/refresh") || url.includes("/auth/login");
}
