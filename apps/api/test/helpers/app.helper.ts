import request from "supertest";

import { createApp } from "../../src/server";

const app = createApp();

export function api() {
	return request(app);
}
