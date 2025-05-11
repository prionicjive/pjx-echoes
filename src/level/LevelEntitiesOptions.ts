import { Point } from "../utils/types";

export interface LevelEntitiesOptions {
    player: Point;
    walls: Point[];
    finishAreas: Point[];
    torchEntities: Point[];
    antiEntities: Point[];
    sentries: Point[];   
}
