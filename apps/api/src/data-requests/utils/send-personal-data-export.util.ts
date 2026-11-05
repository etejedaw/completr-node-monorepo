import { type Response } from "express";

import { buildExportFilename } from "../../common/utils/send-export.util";

export function sendPersonalDataExport(
	response: Response,
	username: string,
	personalData: unknown
) {
	response.setHeader(
		"Content-Disposition",
		`attachment; filename="${buildExportFilename(`data-${username}`, "json")}"`
	);
	return response.status(200).json(personalData);
}
