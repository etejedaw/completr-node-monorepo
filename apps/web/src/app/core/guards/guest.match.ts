import { inject } from "@angular/core";
import { type CanMatchFn } from "@angular/router";

import { AuthService } from "../services/auth";

export const guestMatch: CanMatchFn = () => !inject(AuthService).token();
