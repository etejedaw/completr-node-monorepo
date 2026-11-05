import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../database/sequelize.database";
import {
	DATA_REQUEST_STATUSES,
	DATA_REQUEST_TYPES,
	type DataRequestStatus,
	type DataRequestType
} from "./data-requests.constants";

class DataRequest extends Model {
	declare id: string;
	declare userId: string | null;
	declare type: DataRequestType;
	declare status: DataRequestStatus;
	declare resolutionNote: string | null;
	declare requestedAt: Date;
	declare resolvedAt: Date | null;
	declare resolvedById: string | null;
	declare createdAt: Date;
	declare updatedAt: Date;
}

DataRequest.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		userId: {
			type: DataTypes.UUID,
			allowNull: true
		},
		type: {
			type: DataTypes.ENUM(...DATA_REQUEST_TYPES),
			allowNull: false
		},
		status: {
			type: DataTypes.ENUM(...DATA_REQUEST_STATUSES),
			allowNull: false,
			defaultValue: "pending"
		},
		resolutionNote: {
			type: DataTypes.TEXT,
			allowNull: true
		},
		requestedAt: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: DataTypes.NOW
		},
		resolvedAt: {
			type: DataTypes.DATE,
			allowNull: true
		},
		resolvedById: {
			type: DataTypes.UUID,
			allowNull: true
		}
	},
	{
		sequelize,
		indexes: [
			{
				name: "DataRequests_userId_type_status_idx",
				fields: ["userId", "type", "status"]
			},
			{
				name: "DataRequests_userId_type_pending_uidx",
				unique: true,
				fields: ["userId", "type"],
				where: { status: "pending" }
			},
			{
				name: "DataRequests_status_requestedAt_idx",
				fields: ["status", "requestedAt"]
			}
		]
	}
);

export { DataRequest };
