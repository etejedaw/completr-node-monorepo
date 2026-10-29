import {
	type gamePlatinumPublicSerializer,
	type gamePlatinumSerializer
} from "./game-platinum.serializer";

export type SerializedGamePlatinum =
	| ReturnType<typeof gamePlatinumSerializer>
	| ReturnType<typeof gamePlatinumPublicSerializer>;
