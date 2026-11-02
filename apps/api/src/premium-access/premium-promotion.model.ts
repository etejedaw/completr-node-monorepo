import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../database/sequelize.database";
import {
	FULL_PREMIUM_FEATURE,
	PREMIUM_FEATURES,
	type PremiumGrantFeature
} from "./premium-access.constants";

class PremiumPromotion extends Model {
	declare id: string;
	declare code: string;
	declare feature: PremiumGrantFeature;
	declare startsAt: Date;
	declare endsAt: Date;
	declare createdAt: Date;
	declare updatedAt: Date;
}

PremiumPromotion.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		code: {
			type: DataTypes.STRING(80),
			allowNull: false,
			unique: true
		},
		feature: {
			type: DataTypes.STRING,
			allowNull: false,
			validate: {
				isIn: [[...PREMIUM_FEATURES, FULL_PREMIUM_FEATURE]]
			}
		},
		startsAt: {
			type: DataTypes.DATE,
			allowNull: false
		},
		endsAt: {
			type: DataTypes.DATE,
			allowNull: false
		}
	},
	{ sequelize }
);

export { PremiumPromotion };
