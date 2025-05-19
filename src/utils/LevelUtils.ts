import * as planck from 'planck';
import { CellularAutomataOptions, DrunkardsWalkWithSmoothingOptions, MapGenerationType, ProGenLevelOptions } from "../config/ProcGenLevelsConfig";
import { Level, LevelContainers } from "../level/Level";
import { LevelSkeleton } from "../level/LevelSkeleton";
import { Point } from "../utils/types";
import { MapUtils } from "./MapUtils";
import * as PIXI from 'pixi.js';

export class LevelUtils {
    static createProcGenLevel(
        renderer: PIXI.Renderer,
        world: planck.World, 
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
        const exitPositions = createExitPositions(openSpaces, playerSpawnPosition);
        const gatePositions = createGatePositions(openSpaces, exitPositions);
        const switchPositions = createSwitchPositions(openSpaces, exitPositions);
        const torchPositions = createTorchPositions(openSpaces);
        const antiPositions = createAntiPositions(openSpaces);
        const sentryPositions = createSentryPositions(openSpaces);

        return { 
            dimensions,
            wallPositions,
            playerSpawnPosition,
            exitPositions,
            gatePositions,
            switchPositions,
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

        function createExitPositions(validSpaces: string[], playerSpawnPoint: Point): Point[] {
            const exitPositions: Point[] = [];
            
            // Randomly place exits in open spaces for the player to reach
            const numExits = Math.ceil(validSpaces.length * levelOptions.exitChance);
            for (let i = 0; i < numExits; i++) {
                // Check to see if there are any valid spaces left
                if (validSpaces.length === 0) {
                    break;
                }
                exitPositions.push(LevelUtils.spliceRandomValidPointWithMinDistance(
                    validSpaces, 
                    playerSpawnPoint, 
                    levelOptions.minDistanceBetweenPlayerSpawnAndExit
                ));
            }
            
            return exitPositions;
        }

        
        function createGatePositions(validSpaces: string[], exitPositions: Point[]): Point[] {
            const gatePositions: Point[] = [];
            
            // TODO Methodically place gates in open spaces in a radius arount the exit to obstruct the player
            // TODO Find all tiles of exacltly a certain distance from the exit and make them gates 
            const numGates = Math.ceil(8);
            for (let i = 0; i < numGates; i++) {
                // Check to see if there are any valid spaces left
                if (validSpaces.length === 0) {
                    break;
                }

                // TODO Do the radius distance check and get back an array of valid spaces, then fill them all in
                gatePositions.push(LevelUtils.spliceRandomValidPointWithMinDistance(
                    validSpaces, 
                    exitPositions[0], 
                    levelOptions.radiusAroundExitForGates
                ));
            }
            
            return gatePositions;
        }


        function createSwitchPositions(validSpaces: string[], exitPositions: Point[]): Point[] {
            const switchPositions: Point[] = [];

            // TODO Look at all exit positions and gather a list of all valid spaces that are a minmum distance away from all of them
            // TODO This might look like getting all the valid spaces that are a min distance from one exit, then doing that for all of them and then filtering out any over down to what works for all of them
            // TODO If no spaces satisfy the critera, just put it in a random valid space
            const numSwitches = Math.ceil(1);
            for (let i = 0; i < numSwitches; i++) {
                // Check to see if there are any valid spaces left
                if (validSpaces.length === 0) {
                    break;
                }

                switchPositions.push(LevelUtils.spliceRandomValidPointWithMinDistance(
                    validSpaces, 
                    exitPositions[0], 
                    levelOptions.minDistanceBetweenSwitchAndExit
                ));
            }
            
            return switchPositions;
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
