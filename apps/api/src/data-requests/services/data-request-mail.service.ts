import { environmentConfig } from "../../common/config/environment.config";
import { mailConfig } from "../../common/config/mail.config";
import { PinoLogger } from "../../common/logger/pino.logger";
import { type MailContent } from "../../mail/mail.interface";
import { mailProvider } from "../../mail/mail.provider";
import {
	type DataRequestEmailDetails,
	type DataRequestRecipient,
	type DataRequestSnapshot
} from "../data-requests.interface";
import {
	dataRequestDueAt,
	exportDownloadableUntil
} from "../utils/data-request-deadlines.util";
import { buildDataRequestReceivedEmail } from "../utils/data-request-received-email.util";
import { buildDataRequestResolvedEmail } from "../utils/data-request-resolved-email.util";

const ADMIN_QUEUE_PATH = "/admin/users";
const USER_REQUESTS_PATH = "/settings/data";

const logger = new PinoLogger("Data Requests Mail");

function toIsoDate(date: Date) {
	return date.toISOString().slice(0, 10);
}

function webAppUrl(path: string) {
	return new URL(path, environmentConfig.WEB_APP_URL).toString();
}

function emailDetails(
	request: DataRequestSnapshot,
	username: string
): DataRequestEmailDetails {
	const downloadableUntil = exportDownloadableUntil(request);
	return {
		requestId: request.id,
		type: request.type,
		status: request.status,
		username,
		requestedDate: toIsoDate(request.requestedAt),
		dueDate: toIsoDate(dataRequestDueAt(request.requestedAt)),
		downloadableUntilDate: downloadableUntil
			? toIsoDate(downloadableUntil)
			: null,
		resolutionNote: request.resolutionNote
	};
}

async function sendWithoutBlocking(to: string, content: MailContent) {
	if (!mailProvider.isConfigured) {
		logger.warn("send", "skipped", { reason: "mail not configured" });
		return;
	}
	try {
		await mailProvider.send({ to, ...content });
	} catch (error) {
		logger.warn("send", "failed", {
			error: error instanceof Error ? error.message : String(error)
		});
	}
}

export async function notifyAdminOfNewRequest(
	request: DataRequestSnapshot,
	requester: DataRequestRecipient
) {
	await sendWithoutBlocking(
		mailConfig.DATA_REQUESTS_NOTIFY_EMAIL,
		buildDataRequestReceivedEmail(
			emailDetails(request, requester.username),
			webAppUrl(ADMIN_QUEUE_PATH),
			environmentConfig.WEB_APP_URL
		)
	);
}

export async function notifyRequesterOfResolution(
	request: DataRequestSnapshot,
	requester: DataRequestRecipient
) {
	await sendWithoutBlocking(
		requester.email,
		buildDataRequestResolvedEmail(
			emailDetails(request, requester.username),
			webAppUrl(USER_REQUESTS_PATH),
			environmentConfig.WEB_APP_URL
		)
	);
}
