import { HttpHandlerFn, HttpRequest } from "@angular/common/http";
import { inject } from "@angular/core";
import {
	BehaviorSubject,
	catchError,
	filter,
	finalize,
	switchMap,
	take,
	throwError
} from "rxjs";
import { AuthService } from "../services/auth.service";
import { ToastService } from "../services/toast.service";
import {
	formatValidationIssues,
	SUPPRESS_VALIDATION_TOAST
} from "../utils/validation-issues.util";

let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

export function errorInterceptor(
	req: HttpRequest<unknown>,
	next: HttpHandlerFn
) {
	const auth = inject(AuthService);
	const toast = inject(ToastService);

	return next(req).pipe(
		catchError(error => {
			if (error.status === 409) {
				const detail =
					error.error?.detail ??
					error.error?.title ??
					"This action was already performed. Please refresh and try again.";
				toast.warning(detail);
				return throwError(() => error);
			}

			if (error.status === 429) {
				toast.warning(
					"Too many requests. Please wait a moment and try again."
				);
				return throwError(() => error);
			}

			if (error.status === 422) {
				const suppress = req.context.get(SUPPRESS_VALIDATION_TOAST);
				if (!suppress) {
					const formatted = formatValidationIssues(error);
					if (formatted) toast.warning(formatted);
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
					auth.clearSession();
					return throwError(() => refreshError);
				}),
				finalize(() => {
					isRefreshing = false;
				})
			);
		})
	);
}

function isAuthRequest(url: string): boolean {
	return url.includes("/auth/refresh") || url.includes("/auth/login");
}
