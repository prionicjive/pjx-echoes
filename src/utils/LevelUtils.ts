import * as planck from 'planck';
import { ProcGenLevelType } from "../level/types";
import { Level, LevelContainers } from "../level/Level";
import { LevelSkeleton } from "../level/LevelSkeleton";
import { PhysicsManager } from "../physics/PhysicManager";
import { Point } from "../utils/types";
import { MapUtils } from "./MapUtils";
import * as PIXI from 'pixi.js';
import { ExitGroup } from '../level/ExitGroup';
import { ColorUtils } from './ColorUtils';
import { CellularAutomataOptions, DrunkardsWalkWithSmoothingOptions, ProcGenLevelOptions, ProcGenLevelsConfig } from '../config/ProcGenLevelsConfig';
import { RandomGenerator } from './RandomGenerator';

export class LevelUtils {
    static createProcGenLevel(
        renderer: PIXI.Renderer,
        world: planck.World,
        physicsManager: PhysicsManager,
        containers: LevelContainers,
        procGenLevelType: ProcGenLevelType
    ) {
        let map: number[][] = [];
        let openSpaces: string[] = [];

        const levelOptions = ProcGenLevelsConfig[procGenLevelType];
        const rng = new RandomGenerator(levelOptions.seed);
        console.log("Generating level with seed: " + rng.seed);

        switch (levelOptions.MapGeneration.type) {
            case "DrunkardsWalkWithSmoothing":
                const drunkardsWalkOptions = levelOptions.MapGeneration.Options as DrunkardsWalkWithSmoothingOptions;
                ({ map, openSpaces } = MapUtils.generateFromDrunkardsWalkWithSmoothing(
                    levelOptions.Dimensions.width,
                    levelOptions.Dimensions.height,
                    drunkardsWalkOptions.percentOpen,
                    drunkardsWalkOptions.maxWalkers,
                    drunkardsWalkOptions.walkerLifetime,
                    drunkardsWalkOptions.smoothingSteps,
                    rng
                ));
            break;
            case "CellularAutomata":
                const cellularAutomataOptions = levelOptions.MapGeneration.Options as CellularAutomataOptions;
                ({ map, openSpaces } = MapUtils.generateFromCellularAutomata(
                    levelOptions.Dimensions.width,
                    levelOptions.Dimensions.height,
                    cellularAutomataOptions.wallChance,
                    cellularAutomataOptions.smoothingSteps,
                    rng
                ));
            break;
        }

        const edgesList = MapUtils.createMergedEdgesFromTilemap(map);
        const entitiesOptions = LevelUtils.createLevelSkeletonFromProcGenMap(map, openSpaces, levelOptions, rng);

        return new Level({
            renderer,
            physicsWorld: world,
            physicsManager,
            containers: {
                bgContainer: containers.bgContainer,
                levelGeometryContainer: containers.levelGeometryContainer,
                preEntitiesContainer: containers.preEntitiesContainer,
                entitiesContainer: containers.entitiesContainer,
                postEntitiesContainer: containers.postEntitiesContainer
            },
            edgesList,
            entitiesOptions,
            seed: rng.seed
        });
    }

    static createLevelSkeletonFromProcGenMap(
        map: number[][],
        openSpaces: string[],
        levelOptions: ProcGenLevelOptions,
        rng: RandomGenerator
    ): LevelSkeleton {
        const dimensions = {
            width: map[0].length,
            height: map.length
        };

        const wallPositions = LevelUtils.gatherWallPositions(map);
        const playerSpawnPosition = LevelUtils.spliceRandomValidPoint(openSpaces, rng);

        if (!playerSpawnPosition) {
            throw new Error("Failed to create player spawn position - Pack up your bags and go home, there's nothing to be done here!");
        }

        // Placement order matters: exits (+ gates) consume openSpaces first, then switches,
        // then collectibles. Each step constrains the next.
        const exitGroups = LevelUtils.createExitGroups(openSpaces, playerSpawnPosition, levelOptions, rng);
        const torchPositions = LevelUtils.createEntityPositions(openSpaces, levelOptions.torchChance, rng);
        const antiPositions = LevelUtils.createEntityPositions(openSpaces, levelOptions.antiChance, rng);
        const sentryPositions = LevelUtils.createEntityPositions(openSpaces, levelOptions.sentryChance, rng);

        return {
            dimensions,
            wallPositions,
            playerSpawnPosition,
            exitGroups,
            torchPositions,
            antiPositions,
            sentryPositions
        };
    }

    // ---------------------------------------------------------------------------
    // Private placement helpers
    // ---------------------------------------------------------------------------

    private static gatherWallPositions(map: number[][]): Point[] {
        const wallPositions: Point[] = [];
        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[y].length; x++) {
                if (map[y][x] === 1) wallPositions.push({ x, y });
            }
        }
        return wallPositions;
    }

    /** Places `Math.ceil(openSpaces.length * chance)` entities, splicing each chosen tile. */
    private static createEntityPositions(openSpaces: string[], chance: number, rng: RandomGenerator): Point[] {
        const positions: Point[] = [];
        const count = Math.ceil(openSpaces.length * chance);
        for (let i = 0; i < count; i++) {
            const pos = LevelUtils.spliceRandomValidPoint(openSpaces, rng);
            if (!pos) break;
            positions.push(pos);
        }
        return positions;
    }

    /**
     * Places all exits, their surrounding gate rings, and a paired switch for each exit.
     * Mutates openSpaces in place — consumed tiles are no longer available for later placements.
     */
    private static createExitGroups(
        openSpaces: string[],
        playerSpawnPoint: Point,
        levelOptions: ProcGenLevelOptions,
        rng: RandomGenerator
    ): ExitGroup[] {
        const exitGroups: ExitGroup[] = [];
        const exitPositions: Point[] = [];
        const allGatedAreas: Point[] = [];
        const distinctColors = ColorUtils.getDistinctColors();

        // Remove a tile from the available pool so nothing else spawns on it.
        const removePoint = (point: Point) => {
            const index = openSpaces.indexOf(`${point.x},${point.y}`);
            if (index !== -1) openSpaces.splice(index, 1);
        };

        const isTooClose = (point: Point, points: Point[], minDistance: number): boolean =>
            points.some(p => Math.hypot(p.x - point.x, p.y - point.y) < minDistance);

        const isInGatedArea = (point: Point): boolean =>
            allGatedAreas.some(gatePos =>
                Math.abs(gatePos.x - point.x) <= levelOptions.radiusAroundExitForGates &&
                Math.abs(gatePos.y - point.y) <= levelOptions.radiusAroundExitForGates
            );

        // Carves out the exit tile and places gate tiles on the perimeter of a square radius.
        // Returns the gate positions that were successfully placed.
        const setupGatedAreaAroundExit = (exitPos: Point, radius: number): Point[] => {
            const positions: Point[] = [];
            removePoint(exitPos);

            for (let y = -radius; y <= radius; y++) {
                for (let x = -radius; x <= radius; x++) {
                    if (x === 0 && y === 0) continue;
                    const pos = { x: exitPos.x + x, y: exitPos.y + y };
                    if (Math.abs(x) === radius || Math.abs(y) === radius) {
                        if (openSpaces.includes(`${pos.x},${pos.y}`)) {
                            removePoint(pos);
                            positions.push(pos);
                        }
                    } else {
                        removePoint(pos);
                    }
                }
            }

            return positions;
        };

        // -----------------------------------------------------------------------
        // Pass 1: Place exits and their gate rings
        // -----------------------------------------------------------------------
        const exitData: Array<{ exitPos: Point; gatePositions: Point[] }> = [];

        for (let i = 0; i < levelOptions.numExits; i++) {
            if (openSpaces.length === 0) break;

            let exitPos: Point | null = null;

            for (let attempt = 0; attempt < levelOptions.exitPlacementRetries; attempt++) {
                const candidate = LevelUtils.getRandomValidPointWithMinDistance(
                    openSpaces,
                    playerSpawnPoint,
                    levelOptions.minDistanceBetweenPlayerSpawnAndExit,
                    rng
                );
                if (!candidate) break;

                if (!isTooClose(candidate, exitPositions, levelOptions.minDistanceBetweenExits)) {
                    exitPos = candidate;
                    break;
                }
            }

            if (!exitPos) {
                console.warn(`[LevelGen] Exit ${i}: placement fell back to unconstrained (distance constraints unmet)`);
                exitPos = LevelUtils.spliceRandomValidPoint(openSpaces, rng);
            }

            if (!exitPos) break;

            const gatePositions = setupGatedAreaAroundExit(exitPos, levelOptions.radiusAroundExitForGates);
            exitData.push({ exitPos, gatePositions });
            allGatedAreas.push(...gatePositions);
            exitPositions.push(exitPos);
        }

        // -----------------------------------------------------------------------
        // Pass 2: Place a switch for each exit
        // -----------------------------------------------------------------------
        for (let i = 0; i < exitData.length; i++) {
            const { exitPos, gatePositions } = exitData[i];
            let switchPos: Point | null = null;

            for (let attempt = 0; attempt < levelOptions.switchPlacementRetries; attempt++) {
                const candidate = LevelUtils.getRandomValidPointWithMinDistance(
                    openSpaces,
                    exitPos,
                    levelOptions.minDistanceBetweenSwitchAndExit,
                    rng
                );
                if (!candidate) break;

                if (!isInGatedArea(candidate)) {
                    switchPos = candidate;
                    removePoint(switchPos);
                    break;
                }
            }

            if (!switchPos) {
                console.warn(`[LevelGen] Switch for exit ${i}: placement fell back to unconstrained (gated-area constraint unmet)`);

                // Try any space outside gated areas before giving up on constraints entirely
                const validSpaces = openSpaces.filter(space => {
                    const [x, y] = space.split(',').map(Number);
                    return !isInGatedArea({ x, y });
                });

                if (validSpaces.length > 0) {
                    const [x, y] = validSpaces[rng.nextInt(validSpaces.length)].split(',').map(Number);
                    switchPos = { x, y };
                    removePoint(switchPos);
                } else {
                    switchPos = LevelUtils.spliceRandomValidPoint(openSpaces, rng);
                }
            }

            if (!switchPos) continue;

            const result = distinctColors.splice(rng.nextInt(distinctColors.length), 1);
            const color = result.length > 0 ? result[0] : ColorUtils.getRandomColor();

            exitGroups.push({
                id: i,
                exitPosition: exitPos,
                gatesPositions: gatePositions,
                switchPosition: switchPos,
                color
            });
        }

        return exitGroups;
    }

    // ---------------------------------------------------------------------------
    // Public utilities
    // ---------------------------------------------------------------------------

    static spliceRandomValidPoint(validSpaces: string[], rng: RandomGenerator): Point | null {
        const randomIndex = rng.nextInt(validSpaces.length);
        const validSpace = validSpaces.splice(randomIndex, 1)[0];
        if (!validSpace) return null;
        const [validX, validY]: string[] = validSpace.split(",");
        return { x: Number(validX), y: Number(validY) };
    }

    static getRandomValidPointWithMinDistance(
        validSpaces: string[],
        startPoint: Point,
        minDistance: number,
        rng: RandomGenerator
    ): Point | null {
        const farSpaces = validSpaces.filter((space) => {
            const [x, y] = space.split(',').map(Number);
            return Math.sqrt((x - startPoint.x) ** 2 + (y - startPoint.y) ** 2) >= minDistance;
        });

        const pool = farSpaces.length > 0 ? farSpaces : validSpaces;
        const validSpace = pool[rng.nextInt(pool.length)];
        if (!validSpace) return null;

        const [x, y] = validSpace.split(',').map(Number);
        return { x, y };
    }
}
