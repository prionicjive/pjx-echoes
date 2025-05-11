import { Config } from "../config/Config";
import { Level } from "../level/Level";
import { MapUtils } from "./MapUtils";
import { LevelContainers } from "../level/Level";
import * as planck from 'planck';

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
        const mergedEdges = MapUtils.createMergedEdgesFromTilemap(map);

        // Construct the level with all entities, including player
        return new Level(
            world, {
                levelGeometryContainer: containers.levelGeometryContainer,
                preEntitiesContainer: containers.preEntitiesContainer,
                entitiesContainer: containers.entitiesContainer
            }, 
            map, 
            openSpaces,
            mergedEdges
        );
    } 
    
    static createLevelFromMap(world: planck.World, containers: LevelContainers, map: number[][], openSpaces: string[]) {
        // Get the reduced "merged" edges from the tilemap
        const mergedEdges = MapUtils.createMergedEdgesFromTilemap(map);
        
        // Construct the level with all entities, including player
        return new Level(
            world, {
                levelGeometryContainer: containers.levelGeometryContainer,
                preEntitiesContainer: containers.preEntitiesContainer,
                entitiesContainer: containers.entitiesContainer
            }, 
            map, 
            openSpaces,
            mergedEdges
        );
    }
}
