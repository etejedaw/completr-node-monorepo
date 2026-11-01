import { DataTypes, Model, Op, Sequelize } from "sequelize";

import { sequelize } from "../database/sequelize.database";
import {
	FULL_PREMIUM_FEATURE,
	PREMIUM_FEATURES,
	type PremiumGrantFeature
} from "./premium-access.constants";

class PremiumGrant extends Model {
	declare id: string;
	declare userId: string | null;
	declare feature: PremiumGrantFeature;
	declare expiresAt: Date | null;
	declare offerCode: string | null;
	declare createdAt: Date;
	declare updatedAt: Date;
}

PremiumGrant.init(
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
		feature: {
			type: DataTypes.STRING,
			allowNull: false,
			validate: {
				isIn: [[...PREMIUM_FEATURES, FULL_PREMIUM_FEATURE]]
			}
		},
		expiresAt: {
			type: DataTypes.DATE,
			allowNull: true
		},
		offerCode: {
			type: DataTypes.STRING,
			allowNull: true
		}
	},
	{
		sequelize,
		indexes: [
			{
				name: "PremiumGrants_userId_offerCode_unique",
				unique: true,
				fields: ["userId", "offerCode"],
				where: {
					offerCode: { [Op.ne]: null },
					userId: { [Op.ne]: null }
				}
			}
		]
	}
);

export { PremiumGrant };
