import { Router } from "express";
import * as usersController from "./users.controller";
import { validateSchema } from "../common/middlewares/validate-schema.middleware";
import { UpdateUserSchema, UsernameParamsSchema } from "./schemas";

const router = Router();

router.get(
	"/users/:username",
	validateSchema(UsernameParamsSchema, "params"),
	usersController.getUserByUsername
);
router.get("/users/deactivate", usersController.getDeactivateUser);
router.get("/users/reactivate", usersController.getReactivateUser);
router.patch(
	"/users/:userId",
	validateSchema(UpdateUserSchema, "body"),
	usersController.patchUser
);

export default router;
