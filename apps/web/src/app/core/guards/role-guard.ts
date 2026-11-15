import { HttpErrorResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { type CanActivateFn, Router } from "@angular/router";
import { catchError, map, of } from "rxjs";

import { type User } from "../models";
import { AuthService } from "../services/auth";

const FORBIDDEN_ROUTE = "/403";

function isAuthRejection(error: unknown): boolean {
	return (
		error instanceof HttpErrorResponse &&
		(error.status === 401 || error.status === 403)
	);
}

export function roleGuard(
	isAllowed: (role?: User["role"]) => boolean
): CanActivateFn {
	return () => {
		const auth = inject(AuthService);
		const router = inject(Router);
		const forbidden = () => router.createUrlTree([FORBIDDEN_ROUTE]);

		const user = auth.user();
		if (user) return isAllowed(user.role) || forbidden();

		if (!auth.token()) return forbidden();

		return auth.loadUser().pipe(
			map(() => isAllowed(auth.user()?.role) || forbidden()),
			catchError(error =>
				of(isAuthRejection(error) ? forbidden() : false)
			)
		);
	};
}
