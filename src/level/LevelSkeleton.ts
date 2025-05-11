import { Point } from "../utils/types";

export interface LevelSkeleton {
    dimensions: { width: number; height: number };
    playerSpawnPosition: Point;
    wallPositions: Point[];
    finishAreaPositions: Point[];
    torchPositions: Point[];
    antiPositions: Point[];
    sentryPositions: Point[];   
}
