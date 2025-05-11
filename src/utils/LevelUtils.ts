import { Config } from "../config/Config";
import { Level } from "../level/Level";
import { MapUtils } from "./MapUtils";
import { LevelContainers } from "../level/Level";
import * as planck from 'planck';
import { Point } from "../utils/types";
import { LevelSkeleton } from "../level/LevelSkeleton";

export class LevelUtils {
    static createRandomLevel(world: planck.World, containers: LevelContainers) {
        // Regenerate level and place player and finish tiles
        // const { map: levelMap, openSpaces} = MapUtils.generateFromCellularAutomata(
        //     Config.LevelDimensions.width, 
        //     Config.LevelDimensions.height,
        //     Config.MapGeneration.CellularAutomata.wallChance,
        //     Config.MapGeneration.CellularAutomata.smoothingSteps
        // );

        const { map, openSpaces } = MapUtils.generateFromDrunkardsWalkWithSmoothing(
            Config.RandomLevel.Dimensions.width,
            Config.RandomLevel.Dimensions.height,
            Config.MapGeneration.DrunkardsWalkWithSmoothing.percentOpen,
            Config.MapGeneration.DrunkardsWalkWithSmoothing.maxWalkers,
            Config.MapGeneration.DrunkardsWalkWithSmoothing.walkerLifetime,
            Config.MapGeneration.DrunkardsWalkWithSmoothing.smoothingSteps
        );

        // Get the reduced "merged" edges from the tilemap
        const edgesList = MapUtils.createMergedEdgesFromTilemap(map);
        
        // Get the entities options
        const entitiesOptions = LevelUtils.createLevelSkeletonFromRandomMap(map, openSpaces);

        // Construct the level with all entities, including player
        return new Level({
            world, 
            containers: {
                levelGeometryContainer: containers.levelGeometryContainer,
                preEntitiesContainer: containers.preEntitiesContainer,
                entitiesContainer: containers.entitiesContainer
            }, 
            edgesList,
            entitiesOptions
        });
    }
    
    static createLevelSkeletonFromRandomMap(map: number[][], openSpaces: string[]): LevelSkeleton {
        const dimensions = {
            width: map[0].length,
            height: map.length
        };

        const wallPositions = gatherWallPositions(map);
        const playerSpawnPosition = createPlayerSpawnPosition(openSpaces);
        const finishAreaPositions = createFinishAreaPositions(openSpaces, playerSpawnPosition);
        const torchPositions = createTorchPositions(openSpaces);
        const antiPositions = createAntiPositions(openSpaces);
        const sentryPositions = createSentryPositions(openSpaces);

        return { 
            dimensions,
            wallPositions,
            playerSpawnPosition,
            finishAreaPositions,
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

        function createFinishAreaPositions(validSpaces: string[], playerSpawnPoint: Point): Point[] {
            const finishAreaPositions: Point[] = [];
            
            // Randomly place finish areas in open spaces for the player to reach
            const numFinishAreas = Math.ceil(validSpaces.length * Config.FinishAreaChance);
            for (let i = 0; i < numFinishAreas; i++) {
                // Check to see if there are any valid spaces left
                if (validSpaces.length === 0) {
                    break;
                }
                finishAreaPositions.push(LevelUtils.spliceRandomValidPointWithMinDistance(
                    validSpaces, 
                    playerSpawnPoint, 
                    Config.RandomLevel.minDistanceBetweenPlayerSpawnAndExit
                ));
            }
            
            return finishAreaPositions;
        }

        function createTorchPositions(validSpaces: string[]): Point[] {
            const torchPositions: Point[] = [];
            
            // Randomly place torches in open spaces for the player to reach
            const numTorches = Math.ceil(validSpaces.length * Config.TorchChance);
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
            const numAntis = Math.ceil(validSpaces.length * Config.AntiChance);
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
            const numSentries = Math.ceil(validSpaces.length * Config.SentryChance);
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

    static spliceRandomValidPointWithMinDistance(
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

        // Splice the valid space from the valid spaces array before returning
        validSpaces.splice(validSpaces.indexOf(validSpace), 1);

        return { x, y };
    }
}
