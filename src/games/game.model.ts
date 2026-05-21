import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { Platform } from "../platforms/platform.model";
import { Genre } from "../genres/genres.model";
import { GameScore } from "../game-scores/game-score.model";
import { GameTime } from "../game-times/game-time.model";
import { GameExternal } from "../game-external/game-external.model";

class Game extends Model {
	declare id: string;
	declare title: string;
	declare code: string;
	declare description: string;
	declare releaseAt?: Date;
	declare coverUrl?: string;
	declare backgroundUrl?: string;
	declare isDlc: boolean;
	declare parentGameId?: string;
	declare variant?: string | null;
	declare isActive: boolean;
	declare createdAt: Date;
	declare updatedAt: Date;
	declare Platforms: Platform[];
	declare Genres: Genre[];
	declare GameScores: GameScore[];
	declare GameTimes: GameTime[];
	declare GameExternals: GameExternal[];
	declare Dlcs: Game[];
	declare ParentGame: Game | null;
}

Game.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		title: {
			type: DataTypes.STRING(200),
			allowNull: false
		},
		code: {
			type: DataTypes.STRING(200),
			unique: true,
			allowNull: false
		},
		description: DataTypes.TEXT,
		releaseAt: DataTypes.DATEONLY,
		coverUrl: DataTypes.STRING,
		backgroundUrl: DataTypes.STRING,
		isDlc: {
			type: DataTypes.BOOLEAN,
			defaultValue: false
		},
		parentGameId: {
			type: DataTypes.UUID,
			allowNull: true
		},
		variant: {
			type: DataTypes.STRING(100),
			allowNull: true
		},
		isActive: {
			type: DataTypes.BOOLEAN,
			defaultValue: true
		}
	},
	{ sequelize }
);

export { Game };
