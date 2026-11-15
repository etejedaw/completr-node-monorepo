import { type RewindStoryFormat } from "../../rewind";
import { type RewindStoryImage } from "../../rewind-story-image.model";

export interface RewindSharePage {
	key: RewindStoryFormat;
	image: RewindStoryImage;
	tab: string;
	alt: string;
	downloadLabel: string;
	fileName: string;
}
