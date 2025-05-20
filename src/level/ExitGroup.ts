import { Point } from "../utils/types";

export interface ExitGroup {
    id: number;
    exitPosition: Point;
    gatesPositions: Point[];
    switchPosition: Point;
    color: number; // Hex color value
}