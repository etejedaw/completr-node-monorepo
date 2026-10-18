import { DOCUMENT } from "@angular/common";
import { inject } from "@angular/core";
import { type CanActivateFn, Router } from "@angular/router";

import { BETA_SIGNUP_URL } from "../../shared/constants/beta-signup";
import { AuthService } from "../services/auth";

export const betaSignupRedirectGuard: CanActivateFn = () => {
	if (inject(AuthService).token()) {
		return inject(Router).createUrlTree(["/backlog"]);
	}
	inject(DOCUMENT).defaultView?.location.assign(BETA_SIGNUP_URL);
	return false;
};
