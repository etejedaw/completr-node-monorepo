import { Router } from "express";

import * as wellKnownController from "./well-known.controller";

const router = Router();

router.get("/.well-known/security.txt", wellKnownController.getSecurityTxt);
router.get("/robots.txt", wellKnownController.getRobotsTxt);

export default router;
