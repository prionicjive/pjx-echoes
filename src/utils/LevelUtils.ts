import * as planck from 'planck';
import { CellularAutomataOptions, DrunkardsWalkWithSmoothingOptions, MapGenerationType, ProGenLevelOptions } from "../config/ProcGenLevelsConfig";
import { Level, LevelContainers } from "../level/Level";
import { LevelSkeleton } from "../level/LevelSkeleton";
import { PhysicsManager } from "../physics/PhysicManager";
import { Point } from "../utils/types";
import { MapUtils } from "./MapUtils";
import * as PIXI from 'pixi.js';
import { ExitGroup } from '../level/ExitGroup';
import { ColorUtils } from './ColorUtils';

export class LevelUtils {
    static createProcGenLevel(
        renderer: PIXI.Renderer,
        world: planck.World,
        physicsManager: PhysicsManager,
        containers: LevelContainers,
        levelOptions: ProGenLevelOptions
    ) {
        // Regenerate level and place player and exit tiles
        // const { map: levelMap, openSpaces} = MapUtils.generateFromCellularAutomata(
        //     Config.LevelDimensions.width, 
        //     Config.LevelDimensions.height,
        //     Config.MapGeneration.CellularAutomata.wallChance,
        //     Config.MapGeneration.CellularAutomata.smoothingSteps
        // );

        let map: number[][] = [];
        let openSpaces: string[] = [];
        
        switch (levelOptions.mapGeneration.type as MapGenerationType) {
            case "DrunkardsWalkWithSmoothing":
                const drunkardsWalkOptions = levelOptions.mapGeneration.options as DrunkardsWalkWithSmoothingOptions;
                ({ map, openSpaces } = MapUtils.generateFromDrunkardsWalkWithSmoothing(
                    levelOptions.dimensions.width,
                    levelOptions.dimensions.height,
                    drunkardsWalkOptions.percentOpen,
                    drunkardsWalkOptions.maxWalkers,
                    drunkardsWalkOptions.walkerLifetime,
                    drunkardsWalkOptions.smoothingSteps
                ));
            break;
            case "CellularAutomata":
                const cellularAutomataOptions = levelOptions.mapGeneration.options as CellularAutomataOptions;
                ({ map, openSpaces } = MapUtils.generateFromCellularAutomata(
                    levelOptions.dimensions.width,
                    levelOptions.dimensions.height,
                    cellularAutomataOptions.wallChance,
                    cellularAutomataOptions.smoothingSteps
                ));
            break;
        }

        // Get the reduced "merged" edges from the tilemap
        const edgesList = MapUtils.createMergedEdgesFromTilemap(map);
        
        // Get the entities options
        const entitiesOptions = LevelUtils.createLevelSkeletonFromProcGenMap(map, openSpaces, levelOptions);

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
            entitiesOptions
        });
    }
    
    static createLevelSkeletonFromProcGenMap(
        map: number[][], 
        openSpaces: string[],
        levelOptions: ProGenLevelOptions
    ): LevelSkeleton {
        const dimensions = {
            width: map[0].length,
            height: map.length
        };

        const wallPositions = gatherWallPositions(map);
        const playerSpawnPosition = createPlayerSpawnPosition(openSpaces);
        
        // Create exit groups
        const exitGroups: ExitGroup[] = createExitGroups(
            openSpaces, 
            playerSpawnPosition, 
            levelOptions
        );

        const torchPositions = createTorchPositions(openSpaces);
        const antiPositions = createAntiPositions(openSpaces);
        const sentryPositions = createSentryPositions(openSpaces);

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

        function createPlayerSpawnPosition(validSpaces: string[]): Point {
            return LevelUtils.spliceRandomValidPoint(validSpaces);
        }

        function createExitGroups(
            openSpaces: string[],
            playerSpawnPoint: Point,
            levelOptions: ProGenLevelOptions
        ): ExitGroup[] {
            const exitGroups: ExitGroup[] = [];
            
            // Create a working copy of open spaces
            const availableSpaces = [...openSpaces];
            
            // Helper to check if a point is too close to any existing point
            const isTooClose = (point: Point, points: Point[], minDistance: number): boolean => {
                return points.some(p => 
                    Math.hypot(p.x - point.x, p.y - point.y) < minDistance
                );
            };
            
            // Helper to remove a point from available spaces
            const removePoint = (point: Point) => {
                const index = availableSpaces.indexOf(`${point.x},${point.y}`);
                if (index !== -1) {
                    availableSpaces.splice(index, 1);
                }
            };

            // Helper for finding positions around exit
            const findPositionsAroundExit = (
                exitPos: Point,
                radius: number,
                availableSpaces: string[]
            ): Point[] => {
                const positions: Point[] = [];
                const candidates: Point[] = [];
                
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
                                candidates.push(pos);
                            }
                        }
                    }
                }
                
                // Sort by distance to exit (closest first)
                candidates.sort((a, b) => {
                    const distA = Math.hypot(a.x - exitPos.x, a.y - exitPos.y);
                    const distB = Math.hypot(b.x - exitPos.x, b.y - exitPos.y);
                    return distA - distB;
                });
                
                // Add a minimum of 16 gates (one per cardinal direction)
                const maxGates = Math.min(16, candidates.length);
                for (let i = 0; i < maxGates; i++) {
                    positions.push(candidates[i]);
                }
                
                return positions;
            }
            
            // ===============================================================
            // ===============================================================
            // ===============================================================
            
            // Place exits first
            for (let i = 0; i < levelOptions.numExits; i++) {
                if (availableSpaces.length === 0) break;
                
                // Try to find a position that's far enough from player and other exits
                let exitPos: Point | null = null;
                const exitPositions = exitGroups.map(g => g.exitPosition);
                
                // Try a few times to find a good position
                for (let attempt = 0; attempt < 10; attempt++) {
                    const candidate = LevelUtils.getRandomValidPointWithMinDistance(
                        availableSpaces,
                        playerSpawnPoint,
                        levelOptions.minDistanceBetweenPlayerSpawnAndExit
                    );
                    
                    if (!isTooClose(candidate, exitPositions, levelOptions.minDistanceBetweenExits || 10)) {
                        exitPos = candidate;
                        
                        // Remove exit position from available spaces
                        removePoint(exitPos);
                        
                        break;
                    }
                }
                
                // If we couldn't find a good position, just take any position
                if (!exitPos) {
                    exitPos = LevelUtils.spliceRandomValidPoint(availableSpaces);
                }
                
                if (!exitPos) break; // No more spaces
                
                // Create gates around the exit
                const gates: Point[] = [];
                const gatePositions: Point[] = findPositionsAroundExit(
                    exitPos, 
                    levelOptions.radiusAroundExitForGates || 3,
                    availableSpaces
                );
                
                // Remove gate positions from available spaces
                gatePositions.forEach(p => {
                    removePoint(p);
                    gates.push(p);
                });
                
                // Create switch position (must be outside gate radius)
                let switchPos: Point | null = null;
                let candidatePositions: Point[] = [];
                const minSwitchDistance = levelOptions.minDistanceBetweenSwitchAndExit || 5;
                
                // Try to find a position that's not too close to any exit
                for (let attempt = 0; attempt < 20; attempt++) {
                    const candidate = LevelUtils.getRandomValidPointWithMinDistance(
                        availableSpaces,
                        exitPos,
                        minSwitchDistance
                    );
                    
                    // If the candidate is valid and hasn't already been tested...
                    if (candidate && !candidatePositions.some(p => p.x === candidate.x && p.y === candidate.y)) {
                        candidatePositions.push(candidate);
                        // Check if it's not too close to any other exit
                        const tooClose = exitGroups.some(group => 
                            Math.hypot(
                                group.exitPosition.x - candidate.x, 
                                group.exitPosition.y - candidate.y
                            ) < (levelOptions.radiusAroundExitForGates || 3)
                        );
                        
                        if (!tooClose) {
                            switchPos = candidate;
                            
                            // Remove switch position from available spaces
                            removePoint(switchPos);
                            
                            break;
                        }
                    }
                }
                
                // If we couldn't find a good position, skip this exit group
                if (!switchPos) {
                    console.warn(`Could not place switch for exit at ${exitPos.x},${exitPos.y}. Removing exit group.`);
                    continue;
                }
                
                // Create the exit group
                exitGroups.push({
                    id: i,
                    exitPosition: exitPos,
                    gatesPositions: gates,
                    switchPosition: switchPos,
                    color: ColorUtils.getRandomColor(0.25, 0.66) // Pick a random color with at least 25% brightness
                });
            }
            
            return exitGroups;
        }

        function createTorchPositions(validSpaces: string[]): Point[] {
            const torchPositions: Point[] = [];
            
            // Randomly place torches in open spaces for the player to reach
            const numTorches = Math.ceil(validSpaces.length * levelOptions.torchChance);
            for (let i = 0; i < numTorches; i++) {
                // Check to see if there are any valid spaces left
                if (validSpaces.length === 0) {
                    break;
                }

                torchPositions.push(LevelUtils.spliceRandomValidPoint(validSpaces));
            }
            
            return torchPositions;
        }

        function createAntiPositions(validSpaces: string[]): Point[] {
            const antiPositions: Point[] = [];
            
            // Randomly place antis in open spaces for the player to reach
            const numAntis = Math.ceil(validSpaces.length * levelOptions.antiChance);
            for (let i = 0; i < numAntis; i++) {
                // Check to see if there are any valid spaces left
                if (validSpaces.length === 0) {
                    break;
                }

                antiPositions.push(LevelUtils.spliceRandomValidPoint(validSpaces));
            }
            
            return antiPositions;
        }

        function createSentryPositions(validSpaces: string[]): Point[] {
            const sentryPositions: Point[] = [];
            
            // Randomly place sentries in open spaces for the player to reach
            const numSentries = Math.ceil(validSpaces.length * levelOptions.sentryChance);
            for (let i = 0; i < numSentries; i++) {
                // Check to see if there are any valid spaces left
                if (validSpaces.length === 0) {
                    break;
                }

                sentryPositions.push(LevelUtils.spliceRandomValidPoint(validSpaces));
            }
            
            return sentryPositions;
        }
    }

    static spliceRandomValidPoint(validSpaces: string[]): Point {
        // Splice a valid space from the array
        const randomIndex = Math.floor(Math.random() * validSpaces.length);
        const validSpace = validSpaces.splice(randomIndex, 1)[0];
        const [validX, validY]: string[] = validSpace.split(",");
        return { x: Number(validX), y: Number(validY) };
    }

    static getRandomValidPointWithMinDistance(
        validSpaces: string[],
        startPoint: Point,
        minDistance: number
    ): Point{
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
        const validSpace = pool[Math.floor(Math.random() * pool.length)];
        const [x, y] = validSpace.split(',').map(Number);
        return { x, y };
    }
}
