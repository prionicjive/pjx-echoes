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

const DISTINCT_COLORS = ColorUtils.getDistinctColors();

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
                    rng // Pass the RNG instance
                ));
            break;
            case "CellularAutomata":
                const cellularAutomataOptions = levelOptions.MapGeneration.Options as CellularAutomataOptions;
                ({ map, openSpaces } = MapUtils.generateFromCellularAutomata(
                    levelOptions.Dimensions.width,
                    levelOptions.Dimensions.height,
                    cellularAutomataOptions.wallChance,
                    cellularAutomataOptions.smoothingSteps,
                    rng // Pass the RNG instance
                ));
            break;
        }

        // Get the reduced "merged" edges from the tilemap
        const edgesList = MapUtils.createMergedEdgesFromTilemap(map);
        
        // Get the entities options
        const entitiesOptions = LevelUtils.createLevelSkeletonFromProcGenMap(map, openSpaces, levelOptions, rng); // Pass the RNG instance

        // Construct the level with all entities, including player
        return new Level({
            renderer,
            physicsWorld: world, 
            physicsManager,
            containers: {
                bgContainer: containers.bgContainer,
                levelGeometryContainer: containers.levelGeometryContainer,
                preEntitiesContainer: containers.preEntitiesContainer,
                entitiesContainer: containers.entitiesContainer
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

        const wallPositions = gatherWallPositions(map);
        const playerSpawnPosition = createPlayerSpawnPosition(openSpaces, rng); // Pass the RNG instance

        if (!playerSpawnPosition) {
            throw new Error("Failed to create player spawn position - Pack up your bags and go home, there's nothing to be done here!");
        }
        
        // Create exit groups
        const exitGroups: ExitGroup[] = createExitGroups(
            openSpaces, 
            playerSpawnPosition, 
            levelOptions,
            rng // Pass the RNG instance
        );

        const torchPositions = createTorchPositions(openSpaces, rng); // Pass the RNG instance
        const antiPositions = createAntiPositions(openSpaces, rng); // Pass the RNG instance
        const sentryPositions = createSentryPositions(openSpaces, rng); // Pass the RNG instance

        return { 
            dimensions,
            wallPositions,
            playerSpawnPosition,
            exitGroups,
            torchPositions,
            antiPositions,
            sentryPositions 
        };
        
        function gatherWallPositions(map: number[][]): Point[] {
            const wallPositions: Point[] = [];
            
            // Add walls from the map (1 = wall)
            for (let y = 0; y < map.length; y++) {
                for (let x = 0; x < map[y].length; x++) {
                    if (map[y][x] === 1) {
                        wallPositions.push({ x, y });
                    }
                }
            }
            
            return wallPositions;
        }

        function createPlayerSpawnPosition(validSpaces: string[], rng: RandomGenerator): Point | null {
            return LevelUtils.spliceRandomValidPoint(validSpaces, rng); // Pass the RNG instance
        }

        function createExitGroups(
            openSpaces: string[],
            playerSpawnPoint: Point,
            levelOptions: ProcGenLevelOptions,
            rng: RandomGenerator
        ): ExitGroup[] {
            const exitGroups: ExitGroup[] = [];
            const exitPositions: Point[] = [];
            const allGatedAreas: Point[] = [];
            
            // Helper to check if a point is too close to any existing point
            const isTooClose = (point: Point, points: Point[], minDistance: number): boolean => {
                return points.some(p => 
                    Math.hypot(p.x - point.x, p.y - point.y) < minDistance
                );
            };
            
            // Helper to remove a point from available spaces
            const removePoint = (point: Point) => {
                const index = openSpaces.indexOf(`${point.x},${point.y}`);
                if (index !== -1) {
                    openSpaces.splice(index, 1);
                }
            };

            // Helper to check if a point is in any gated area
            const isInGatedArea = (point: Point): boolean => {
                return allGatedAreas.some(gatePos => 
                    Math.abs(gatePos.x - point.x) <= levelOptions.radiusAroundExitForGates && 
                    Math.abs(gatePos.y - point.y) <= levelOptions.radiusAroundExitForGates
                );
            };

            // Helper for finding positions around exit (And making it impossible for entities to spawn within the confines)
            const setupGatedAreaAroundExit = (
                exitPos: Point,
                radius: number,
                availableSpaces: string[]
            ): Point[] => {
                const positions: Point[] = [];
                
                // Generate all possible positions in a circle around the exit
                for (let y = -radius; y <= radius; y++) {
                    for (let x = -radius; x <= radius; x++) {
                        // Skip the center (exit position)
                        if (x === 0 && y === 0) continue;
                        
                        // Only include points on the perimeter for a cleaner look
                        if (Math.abs(x) === radius || Math.abs(y) === radius) {
                            const pos = {
                                x: exitPos.x + x,
                                y: exitPos.y + y
                            };
                            
                            // Check if this position is in available spaces
                            const posStr = `${pos.x},${pos.y}`;
                            if (availableSpaces.includes(posStr)) {
                                removePoint(pos); // Remove the position from available spaces
                                positions.push(pos);
                            }
                        } else {
                            removePoint({
                                x: exitPos.x + x,
                                y: exitPos.y + y
                            });
                        }
                    }
                }
                
                return positions;
            }
            
            // ===============================================================
            // ===============================================================
            // ===============================================================

            // First pass: Place all exits and their gates
            const exitData: Array<{
                exitPos: Point;
                gatePositions: Point[];
            }> = [];
                    
                    // Place exits first
            for (let i = 0; i < levelOptions.numExits; i++) {
                if (openSpaces.length === 0) break;
                
                // Try to find a position that's far enough from player and other exits
                let exitPos: Point | null = null;
                
                // Try a few times to find a good position
                for (let attempt = 0; attempt < 10; attempt++) {
                    const candidate = LevelUtils.getRandomValidPointWithMinDistance(
                        openSpaces,
                        playerSpawnPoint,
                        levelOptions.minDistanceBetweenPlayerSpawnAndExit || levelOptions.radiusAroundExitForGates + 1,
                        rng
                    );
                    
                    // If no valid space within min distance could be found, break
                    if (!candidate) {
                        break;
                    }

                    if (!isTooClose(candidate, exitPositions, levelOptions.minDistanceBetweenExits || 10)) {
                        exitPos = candidate;
                        break;
                    }
                }
                
                // If we couldn't find a good position, just take any position
                if (!exitPos) {
                    exitPos = LevelUtils.spliceRandomValidPoint(openSpaces, rng);
                }
                
                if (!exitPos) break; // No more spaces

                // Create gates around the exit
                const gatePositions = setupGatedAreaAroundExit(
                    exitPos, 
                    levelOptions.radiusAroundExitForGates || 3,
                    openSpaces
                );

                // Store the exit and its gates
                exitData.push({
                    exitPos,
                    gatePositions
                });

                // Track all gated positions
                allGatedAreas.push(...gatePositions);
                exitPositions.push(exitPos);
            }

            // Second pass: Place switches for each exit
            for (let i = 0; i < exitData.length; i++) {
                const data = exitData[i];
                const { exitPos, gatePositions } = data;
                let switchPos: Point | null = null;
                
                // Try to find a position for the switch that's not in any gated area
                for (let attempt = 0; attempt < 20; attempt++) {
                    const candidate = LevelUtils.getRandomValidPointWithMinDistance(
                        openSpaces,
                        exitPos,
                        levelOptions.minDistanceBetweenSwitchAndExit || 5,
                        rng
                    );

                    // If no valid space within min distance could be found, break
                    if (!candidate) {
                        break;
                    }

                    // Check if the candidate is in any gated area
                    if (!isInGatedArea(candidate)) {
                        switchPos = candidate;
                        removePoint(switchPos);
                        break;
                    }
                }

                // If we couldn't find a good position, just take any position
                if (!switchPos) {
                    // Find any open space that's not in a gated area
                    const validSpaces = openSpaces.filter(space => {
                        const [x, y] = space.split(',').map(Number);
                        return !isInGatedArea({x, y});
                    });

                    if (validSpaces.length > 0) {
                        const randomIndex = rng.nextInt(validSpaces.length);
                        const validSpace = validSpaces[randomIndex];
                        const [x, y] = validSpace.split(',').map(Number);
                        switchPos = {x, y};
                        removePoint(switchPos);
                    } else {
                        // Last resort: just take any open space
                        switchPos = LevelUtils.spliceRandomValidPoint(openSpaces, rng);
                    }
                }

                // If no switch position could be found, forget about the whole exit group
                if (!switchPos) {
                    continue;
                }

                // Get a random color from distinct colors (if any are left)
                const result = DISTINCT_COLORS.splice(rng.nextInt(DISTINCT_COLORS.length), 1);
                let color: number;
                
                if (result.length > 0) {
                    color = result[0];
                } else {
                    // Otherwise, just take our chances on a completely random color
                    color = ColorUtils.getRandomColor()
                }
                
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

        function createTorchPositions(validSpaces: string[], rng: RandomGenerator): Point[] {
            const torchPositions: Point[] = [];
            
            // Randomly place torches in open spaces for the player to reach
            const numTorches = Math.ceil(validSpaces.length * levelOptions.torchChance);
            for (let i = 0; i < numTorches; i++) {
                // Check to see if there are any valid spaces left
                const validSpace = LevelUtils.spliceRandomValidPoint(validSpaces, rng)
                if (!validSpace) {
                    break;
                }

                torchPositions.push(validSpace);
            }
            
            return torchPositions;
        }

        function createAntiPositions(validSpaces: string[], rng: RandomGenerator): Point[] {
            const antiPositions: Point[] = [];
            
            // Randomly place antis in open spaces for the player to reach
            const numAntis = Math.ceil(validSpaces.length * levelOptions.antiChance);
            for (let i = 0; i < numAntis; i++) {
                // Check to see if there are any valid spaces left
                const validSpace = LevelUtils.spliceRandomValidPoint(validSpaces, rng)
                if (!validSpace) {
                    break;
                }

                antiPositions.push(validSpace);
            }
            
            return antiPositions;
        }

        function createSentryPositions(validSpaces: string[], rng: RandomGenerator): Point[] {
            const sentryPositions: Point[] = [];
            
            // Randomly place sentries in open spaces for the player to reach
            const numSentries = Math.ceil(validSpaces.length * levelOptions.sentryChance);
            for (let i = 0; i < numSentries; i++) {
                // Check to see if there are any valid spaces left
                const validSpace = LevelUtils.spliceRandomValidPoint(validSpaces, rng)
                if (!validSpace) {
                    break;
                }

                sentryPositions.push(validSpace);
            }
            
            return sentryPositions;
        }
    }

    static spliceRandomValidPoint(validSpaces: string[], rng: RandomGenerator): Point | null {
        // Splice a valid space from the array
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
    ): Point | null{
        // Filter validSpaces by min distance
        const farSpaces = validSpaces.filter((space) => {
            const [x, y] = space.split(',').map(Number);
            const dx = x - startPoint.x;
            const dy = y - startPoint.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist >= minDistance;
        });
    
        // No far spaces could be found, just use any valid space
        const pool = farSpaces.length > 0 ? farSpaces : validSpaces;

        // Randomly choose a space from the pool
        const validSpace = pool[rng.nextInt(pool.length)];
        if (!validSpace) return null;

        const [x, y] = validSpace.split(',').map(Number);
        return { x, y };
    }
}
