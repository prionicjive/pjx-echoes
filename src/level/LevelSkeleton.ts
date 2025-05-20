import { Point } from "../utils/types";
import { ExitGroup } from "./ExitGroup";

export interface LevelSkeleton {
    dimensions: { width: number; height: number };
    playerSpawnPosition: Point;
    wallPositions: Point[];
    exitGroups: ExitGroup[];
    torchPositions: Point[];
    antiPositions: Point[];
    sentryPositions: Point[];   
}
